import type { DocumentData } from 'firebase/firestore';
import { clampInt, clampSeverity } from '../lib/number';
import { isValidHHMM } from '../lib/time';
import type {
  AssessmentRecord,
  RedFlagDetectionResult,
  RefluxLogEntry,
  SleepShieldState,
} from '../types/reflux';

/**
 * Pure data mappers between domain models and Firestore documents.
 * Single responsibility: shape + sanitize. No I/O here (easy to unit test).
 * Limits mirror firestore.rules so invalid payloads never leave the client.
 */

export const DEFAULT_SLEEP_SHIELD: Readonly<SleepShieldState> = Object.freeze({
  windowHours: 3,
  lastMealTimestamp: null,
});

const str = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.slice(0, max) : '';

const arr = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

// ---------------------------------------------------------------- Settings

export function toSleepShieldDoc(next: SleepShieldState) {
  const ts = next.lastMealTimestamp;
  return {
    sleepShieldWindowHours: next.windowHours === 4 ? 4 : 3,
    sleepShieldLastMealMs:
      typeof ts === 'number' && Number.isFinite(ts) && ts >= 0 ? Math.round(ts) : null,
  } as const;
}

export function fromSettingsDoc(data: DocumentData | undefined): SleepShieldState {
  if (!data) return { ...DEFAULT_SLEEP_SHIELD };
  return {
    windowHours: data.sleepShieldWindowHours === 4 ? 4 : 3,
    lastMealTimestamp:
      typeof data.sleepShieldLastMealMs === 'number' ? data.sleepShieldLastMealMs : null,
  };
}

// --------------------------------------------------------------------- Logs

export function toLogDoc(uid: string, entry: RefluxLogEntry): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    userId: uid,
    timestamp: entry.timestamp.slice(0, 40),
    dateStr: entry.dateStr.slice(0, 10),
    timeHHMM: entry.timeHHMM.slice(0, 5),
    rawText: entry.rawText.trim().slice(0, 2000) || 'Kayıt',
    foods: entry.foods.slice(0, 15).map((f) => ({
      rawName: f.rawName.slice(0, 120),
      matchedFoodId: f.matchedFoodId ?? null,
      matchedFoodName: f.matchedFoodName ? f.matchedFoodName.slice(0, 120) : null,
      status: f.status,
      consensusLevel: f.consensusLevel ?? null,
    })),
    symptoms: entry.symptoms.slice(0, 10).map((s) => ({
      code: s.code,
      severity: clampSeverity(s.severity),
    })),
    isLateMeal: Boolean(entry.isLateMeal),
    hasRedFlag: Boolean(entry.redFlag?.hasRedFlag),
    redFlagUrgency: entry.redFlag?.urgency ?? 'NONE',
    source: entry.source,
  };

  if (isValidHHMM(entry.bedtimeHHMM)) {
    payload.bedtimeHHMM = entry.bedtimeHHMM;
  }
  const gap = entry.mealToSleepMinutes;
  if (typeof gap === 'number' && Number.isFinite(gap) && gap >= 0 && gap <= 720) {
    payload.mealToSleepMinutes = Math.round(gap);
  }
  if (entry.redFlag?.hasRedFlag) {
    payload.redFlagHeadline = entry.redFlag.headline.slice(0, 200);
    payload.redFlagGuidance = entry.redFlag.guidance.slice(0, 600);
    payload.redFlagSignals = entry.redFlag.signals.slice(0, 10).map((sig) => ({
      id: sig.id.slice(0, 60),
      label: sig.label.slice(0, 140),
      matchedPhrase: sig.matchedPhrase.slice(0, 100),
      urgency: sig.urgency,
    }));
  }
  if (entry.notesSummary) {
    payload.notesSummary = entry.notesSummary.slice(0, 200);
  }
  return payload;
}

export function fromLogDoc(id: string, data: DocumentData): RefluxLogEntry {
  const redFlag: RedFlagDetectionResult | undefined = data.hasRedFlag
    ? {
        hasRedFlag: true,
        urgency: data.redFlagUrgency || 'URGENT_EVALUATION',
        headline: data.redFlagHeadline || 'Kırmızı Bayrak Uyarısı',
        guidance: data.redFlagGuidance || '',
        signals: arr(data.redFlagSignals),
      }
    : undefined;

  return {
    id,
    timestamp: String(data.timestamp ?? ''),
    dateStr: String(data.dateStr ?? ''),
    timeHHMM: String(data.timeHHMM ?? ''),
    rawText: String(data.rawText ?? ''),
    foods: arr(data.foods),
    symptoms: arr(data.symptoms),
    bedtimeHHMM: typeof data.bedtimeHHMM === 'string' ? data.bedtimeHHMM : undefined,
    mealToSleepMinutes:
      typeof data.mealToSleepMinutes === 'number' ? data.mealToSleepMinutes : undefined,
    isLateMeal: Boolean(data.isLateMeal),
    redFlag,
    source: data.source || 'manual',
    notesSummary: typeof data.notesSummary === 'string' ? data.notesSummary : undefined,
  };
}

// -------------------------------------------------------------- Assessments

export function toAssessmentDoc(uid: string, record: AssessmentRecord) {
  return {
    userId: uid,
    timestamp: record.timestamp.slice(0, 40),
    dateStr: record.dateStr.slice(0, 10),
    rsiAnswers: record.rsiAnswers.slice(0, 9).map((v) => clampInt(v, 0, 5)),
    rsiTotal: clampInt(record.rsiTotal, 0, 45),
    rsiSwallowingScore: clampInt(record.rsiSwallowingScore, 0, 5),
    gerdqAnswers: record.gerdqAnswers.slice(0, 6).map((v) => clampInt(v, 0, 3)),
    gerdqBurdenScore: clampInt(record.gerdqBurdenScore, 0, 18),
    gerdqHeartburnFreqIndex: clampInt(record.gerdqHeartburnFreqIndex, 0, 3),
    gerdqRegurgFreqIndex: clampInt(record.gerdqRegurgFreqIndex, 0, 3),
    profileType: record.profileType,
  };
}

export function fromAssessmentDoc(id: string, data: DocumentData): AssessmentRecord {
  return {
    id,
    timestamp: String(data.timestamp ?? ''),
    dateStr: String(data.dateStr ?? ''),
    rsiAnswers: arr<number>(data.rsiAnswers),
    rsiTotal: Number(data.rsiTotal ?? 0),
    rsiSwallowingScore: Number(data.rsiSwallowingScore ?? 0),
    gerdqAnswers: arr<number>(data.gerdqAnswers),
    gerdqBurdenScore: Number(data.gerdqBurdenScore ?? 0),
    gerdqHeartburnFreqIndex: Number(data.gerdqHeartburnFreqIndex ?? 0),
    gerdqRegurgFreqIndex: Number(data.gerdqRegurgFreqIndex ?? 0),
    profileType: data.profileType || 'LOW_SYMPTOM',
  };
}

export { str as truncateString };
