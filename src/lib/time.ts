/** 24-hour HH:MM validator shared by client, Firestore mapper and server. */
export const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export const WEEKDAY_SHORT_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'] as const;

export function isValidHHMM(value: unknown): value is string {
  return typeof value === 'string' && HHMM_REGEX.test(value);
}

/** Formats a millisecond timestamp as local HH:MM. */
export function formatClockHHMM(msTimestamp: number): string {
  const d = new Date(msTimestamp);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Parses YYYY-MM-DD into a local-noon Date (avoids DST midnight shifts). */
export function parseLocalDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

/** Formats a Date into local YYYY-MM-DD. */
export function formatLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

/** Shifts a YYYY-MM-DD string by `deltaDays` calendar days. */
export function shiftDateStr(dateStr: string, deltaDays: number): string {
  const d = parseLocalDateStr(dateStr);
  d.setDate(d.getDate() + deltaDays);
  return formatLocalDateStr(d);
}

/** Returns today's local YYYY-MM-DD string. */
export function getTodayLocalDateStr(now: Date = new Date()): string {
  return formatLocalDateStr(now);
}

/** Comparator: newest ISO timestamp first. */
export function byTimestampDesc<T extends { timestamp: string }>(a: T, b: T): number {
  return b.timestamp.localeCompare(a.timestamp);
}

/** Returns a new array sorted newest-first (input is never mutated). */
export function sortByTimestampDesc<T extends { timestamp: string }>(items: readonly T[]): T[] {
  return [...items].sort(byTimestampDesc);
}
