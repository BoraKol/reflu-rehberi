import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  firestoreDatabaseId?: string;
}

/**
 * Optional local-only fallback (gitignored) so existing local workspaces keep
 * working seamlessly, while GitHub/CI/production read strictly from `VITE_FIREBASE_*`.
 */
const localConfigModules = import.meta.glob<{ default: Partial<FirebaseClientConfig> }>(
  '../firebase-applet-config.json',
  { eager: true }
);
const localFileConfig: Partial<FirebaseClientConfig> =
  Object.values(localConfigModules)[0]?.default ?? {};

function resolveFirebaseConfig(): FirebaseClientConfig {
  const env = import.meta.env;
  const pick = (envVal: string | undefined, fileVal: string | undefined): string =>
    envVal?.trim() || fileVal?.trim() || '';

  const config: FirebaseClientConfig = {
    apiKey: pick(env.VITE_FIREBASE_API_KEY, localFileConfig.apiKey),
    authDomain: pick(env.VITE_FIREBASE_AUTH_DOMAIN, localFileConfig.authDomain),
    projectId: pick(env.VITE_FIREBASE_PROJECT_ID, localFileConfig.projectId),
    storageBucket: pick(env.VITE_FIREBASE_STORAGE_BUCKET, localFileConfig.storageBucket),
    messagingSenderId: pick(
      env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      localFileConfig.messagingSenderId
    ),
    appId: pick(env.VITE_FIREBASE_APP_ID, localFileConfig.appId),
    firestoreDatabaseId: pick(
      env.VITE_FIREBASE_DATABASE_ID,
      localFileConfig.firestoreDatabaseId
    ),
  };

  if (!config.apiKey || !config.projectId || !config.appId) {
    if (import.meta.env.DEV) {
      console.warn(
        '[Firebase] Yapılandırma eksik. .env.local dosyasına VITE_FIREBASE_* değişkenlerini ekleyin veya demo önizleme modunu kullanın.'
      );
    }
    return {
      apiKey: 'demo-unconfigured',
      authDomain: 'localhost',
      projectId: 'demo-unconfigured',
      appId: '1:000000000000:web:0000000000000000000000',
    };
  }

  return config;
}

const firebaseConfig = resolveFirebaseConfig();

export const isFirebaseConfigured = firebaseConfig.projectId !== 'demo-unconfigured';

/**
 * Firebase composition root. Infrastructure only — no business logic.
 */
const app = initializeApp(firebaseConfig);
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export class FirestoreOperationError extends Error {
  readonly operationType: OperationType;
  readonly code: string;

  constructor(operationType: OperationType, code: string) {
    super(`Firestore ${operationType} failed (${code})`);
    this.name = 'FirestoreOperationError';
    this.operationType = operationType;
    this.code = code;
  }
}

/**
 * Normalises Firestore failures into a typed error.
 * SECURITY: never logs or embeds PII (email, uid, provider data) or document
 * paths containing user identifiers; diagnostics are emitted in dev only.
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  _path?: string | null
): never {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : 'unknown';
  if (import.meta.env.DEV) {
    console.error(`[Firestore] ${operationType} failed:`, code);
  }
  throw new FirestoreOperationError(operationType, code);
}
