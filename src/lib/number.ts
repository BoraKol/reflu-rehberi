/** Clamps a numeric value into the inclusive [min, max] range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Rounds then clamps; non-finite inputs resolve to `fallback`. */
export function clampInt(
  value: unknown,
  min: number,
  max: number,
  fallback = min
): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return clamp(Math.round(n), min, max);
}

/** Symptom severity scale used across the app (1 = hafif … 5 = şiddetli). */
export function clampSeverity(value: unknown): number {
  return clampInt(value, 1, 5, 3);
}
