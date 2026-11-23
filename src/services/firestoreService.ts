import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { createId } from '../lib/id';
import { sortByTimestampDesc } from '../lib/time';
import type { AssessmentRecord, RefluxLogEntry, SleepShieldState } from '../types/reflux';
import {
  DEFAULT_SLEEP_SHIELD,
  fromAssessmentDoc,
  fromLogDoc,
  fromSettingsDoc,
  toAssessmentDoc,
  toLogDoc,
  toSleepShieldDoc,
} from './firestoreMappers';

/**
 * Firestore repository (infrastructure layer).
 * UI code depends on the `HealthDataRepository` abstraction (DIP), never on
 * Firestore SDK details. Mapping/sanitising lives in `firestoreMappers.ts`.
 */
export interface HealthDataCallbacks {
  onSettings: (shield: SleepShieldState) => void;
  onLogs: (logs: RefluxLogEntry[]) => void;
  onAssessments: (assessments: AssessmentRecord[]) => void;
  onError: (err: Error) => void;
}

export interface HealthDataRepository {
  ensureUserSettings(uid: string): Promise<void>;
  saveSleepShield(uid: string, next: SleepShieldState): Promise<void>;
  createLog(uid: string, entry: RefluxLogEntry): Promise<void>;
  deleteLog(uid: string, logId: string): Promise<void>;
  createAssessment(uid: string, record: AssessmentRecord): Promise<void>;
  subscribe(uid: string, callbacks: HealthDataCallbacks): Unsubscribe;
}

const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

function sanitizeDocId(prefix: string, rawId?: string): string {
  return rawId && SAFE_ID_REGEX.test(rawId) ? rawId : createId(prefix);
}

function assertSafeId(id: string): void {
  if (!SAFE_ID_REGEX.test(id)) throw new Error('invalid_id');
}

const userDoc = (uid: string) => doc(db, 'users', uid);

/**
 * PERFORMANCE: the parent `/users/{uid}` document only needs to be verified
 * once per session. Previously every write performed an extra `getDoc`
 * round-trip. In-flight promises are shared to avoid duplicate requests.
 */
const ensuredUsers = new Map<string, Promise<void>>();

export async function ensureUserSettingsDoc(uid: string): Promise<void> {
  assertSafeId(uid);
  const cached = ensuredUsers.get(uid);
  if (cached) return cached;

  const task = (async () => {
    try {
      const ref = userDoc(uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          userId: uid,
          ...toSleepShieldDoc(DEFAULT_SLEEP_SHIELD),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      ensuredUsers.delete(uid); // allow retry after transient failures
      handleFirestoreError(error, OperationType.WRITE);
    }
  })();

  ensuredUsers.set(uid, task);
  return task;
}

/** Drops cached session state (call on sign-out to free memory). */
export function resetFirestoreSessionCache(): void {
  ensuredUsers.clear();
}

export async function saveSleepShieldToCloud(uid: string, next: SleepShieldState): Promise<void> {
  await ensureUserSettingsDoc(uid);
  try {
    await updateDoc(userDoc(uid), { ...toSleepShieldDoc(next), updatedAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE);
  }
}

export async function createLogInCloud(uid: string, entry: RefluxLogEntry): Promise<void> {
  await ensureUserSettingsDoc(uid);
  const docId = sanitizeDocId('log', entry.id);
  try {
    await setDoc(doc(db, 'users', uid, 'logs', docId), {
      ...toLogDoc(uid, entry),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE);
  }
}

export async function deleteLogInCloud(uid: string, logId: string): Promise<void> {
  assertSafeId(logId);
  try {
    await deleteDoc(doc(db, 'users', uid, 'logs', logId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE);
  }
}

export async function createAssessmentInCloud(uid: string, record: AssessmentRecord): Promise<void> {
  await ensureUserSettingsDoc(uid);
  const docId = sanitizeDocId('assess', record.id);
  try {
    await setDoc(doc(db, 'users', uid, 'assessments', docId), {
      ...toAssessmentDoc(uid, record),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE);
  }
}

/** Wraps snapshot errors into the typed, PII-free error before reporting. */
function forwardError(op: OperationType, onError: (err: Error) => void) {
  return (error: unknown) => {
    try {
      handleFirestoreError(error, op);
    } catch (wrapped) {
      onError(wrapped as Error);
    }
  };
}

export function subscribeUserHealthData(uid: string, callbacks: HealthDataCallbacks): Unsubscribe {
  assertSafeId(uid);

  const unsubSettings = onSnapshot(
    userDoc(uid),
    (snap) => callbacks.onSettings(fromSettingsDoc(snap.exists() ? snap.data() : undefined)),
    forwardError(OperationType.GET, callbacks.onError)
  );

  // Explicit `where('userId', '==', uid)` aligns with the rule-side ownership check.
  // Sorting happens client-side to avoid custom composite indexes.
  const unsubLogs = onSnapshot(
    query(collection(db, 'users', uid, 'logs'), where('userId', '==', uid)),
    (snapshot) =>
      callbacks.onLogs(sortByTimestampDesc(snapshot.docs.map((d) => fromLogDoc(d.id, d.data())))),
    forwardError(OperationType.LIST, callbacks.onError)
  );

  const unsubAssessments = onSnapshot(
    query(collection(db, 'users', uid, 'assessments'), where('userId', '==', uid)),
    (snapshot) =>
      callbacks.onAssessments(
        sortByTimestampDesc(snapshot.docs.map((d) => fromAssessmentDoc(d.id, d.data())))
      ),
    forwardError(OperationType.LIST, callbacks.onError)
  );

  return () => {
    unsubSettings();
    unsubLogs();
    unsubAssessments();
  };
}

/** Default Firestore-backed implementation of the repository abstraction. */
export const firestoreHealthRepository: HealthDataRepository = {
  ensureUserSettings: ensureUserSettingsDoc,
  saveSleepShield: saveSleepShieldToCloud,
  createLog: createLogInCloud,
  deleteLog: deleteLogInCloud,
  createAssessment: createAssessmentInCloud,
  subscribe: subscribeUserHealthData,
};
