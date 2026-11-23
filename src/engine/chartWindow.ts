import {
  formatLocalDateStr,
  parseLocalDateStr,
  WEEKDAY_SHORT_TR,
} from '../lib/time';
import { SYMPTOM_CATALOG, type DailyTrendPoint, type RefluxLogEntry } from '../types/reflux';

export type TrendRangeOption = 14 | 30 | 90 | 'all';
export type TrendAxisFilter = 'both' | 'lpr' | 'gerd';

/** Maximum number of daily points rendered simultaneously by Recharts SVG */
export const DEFAULT_CHART_WINDOW_SIZE = 30;
export const CHART_WINDOW_STEP = 15;

export interface VisibilityWindowResult {
  visiblePoints: DailyTrendPoint[];
  startIndex: number;
  endIndex: number;
  totalPoints: number;
  windowSize: number;
  isWindowed: boolean;
  canStepPrev: boolean;
  canStepNext: boolean;
  rangeLabel: string;
}

/**
 * Pure filter for Recharts trend data (intended to be wrapped in useMemo).
 * Avoids mutating input points and supports axis focus + symptom-only filtering.
 */
export function filterTrendSeries(
  points: readonly DailyTrendPoint[],
  axisFilter: TrendAxisFilter,
  onlySymptomDays: boolean
): DailyTrendPoint[] {
  if (!onlySymptomDays && axisFilter === 'both') {
    return points as DailyTrendPoint[];
  }

  const filtered: DailyTrendPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (onlySymptomDays) {
      const hasRelevantSymptom =
        axisFilter === 'lpr'
          ? p.lprScore > 0
          : axisFilter === 'gerd'
            ? p.gerdScore > 0
            : p.lprScore > 0 || p.gerdScore > 0;
      if (!hasRelevantSymptom) continue;
    }
    filtered.push(p);
  }
  return filtered;
}

/**
 * Computes a bounded sliding visibility window over a trend dataset so Recharts
 * never mounts hundreds of SVG nodes at once on large datasets.
 *
 * `windowEndOffsetFromLatest = 0` anchors the window to the most recent points.
 * Positive offsets pan backward into earlier history.
 */
export function sliceVisibilityWindow(
  points: readonly DailyTrendPoint[],
  windowEndOffsetFromLatest: number,
  windowSize: number = DEFAULT_CHART_WINDOW_SIZE
): VisibilityWindowResult {
  const totalPoints = points.length;
  const safeWindowSize = Math.max(1, Math.floor(windowSize));

  if (totalPoints === 0) {
    return {
      visiblePoints: [],
      startIndex: 0,
      endIndex: 0,
      totalPoints: 0,
      windowSize: safeWindowSize,
      isWindowed: false,
      canStepPrev: false,
      canStepNext: false,
      rangeLabel: 'Veri yok',
    };
  }

  if (totalPoints <= safeWindowSize) {
    return {
      visiblePoints: points as DailyTrendPoint[],
      startIndex: 0,
      endIndex: totalPoints,
      totalPoints,
      windowSize: safeWindowSize,
      isWindowed: false,
      canStepPrev: false,
      canStepNext: false,
      rangeLabel:
        totalPoints === 1
          ? points[0].label
          : `${points[0].label} – ${points[totalPoints - 1].label}`,
    };
  }

  const maxOffset = totalPoints - safeWindowSize;
  const clampedOffset = Math.min(
    maxOffset,
    Math.max(0, Math.floor(windowEndOffsetFromLatest))
  );

  const endIndex = totalPoints - clampedOffset;
  const startIndex = Math.max(0, endIndex - safeWindowSize);
  const visiblePoints = points.slice(startIndex, endIndex);

  return {
    visiblePoints,
    startIndex,
    endIndex,
    totalPoints,
    windowSize: safeWindowSize,
    isWindowed: true,
    canStepPrev: startIndex > 0,
    canStepNext: endIndex < totalPoints,
    rangeLabel: `${visiblePoints[0].label} – ${visiblePoints[visiblePoints.length - 1].label}`,
  };
}

// ============================================================================
// Meal-Time vs. Reflux Symptom Interactive Timeline Engine
// ============================================================================

export type TimelineDaySlice = 'all' | 'daytime' | 'evening' | 'late';

export interface TimelineDomainConfig {
  id: TimelineDaySlice;
  label: string;
  shortLabel: string;
  minHour: number;
  maxHour: number;
  ticks: number[];
}

export const TIMELINE_DOMAINS: Record<TimelineDaySlice, TimelineDomainConfig> = {
  all: {
    id: 'all',
    label: 'Tüm Gün (06:00–01:00)',
    shortLabel: 'Tüm Gün',
    minHour: 6,
    maxHour: 25,
    ticks: [6, 9, 12, 15, 18, 21, 24],
  },
  daytime: {
    id: 'daytime',
    label: 'Sabah & Öğle (06:00–16:00)',
    shortLabel: 'Sabah & Öğle',
    minHour: 6,
    maxHour: 16,
    ticks: [6, 8, 10, 12, 14, 16],
  },
  evening: {
    id: 'evening',
    label: 'Akşam (16:00–21:00)',
    shortLabel: 'Akşam',
    minHour: 16,
    maxHour: 21,
    ticks: [16, 17, 18, 19, 20, 21],
  },
  late: {
    id: 'late',
    label: 'Gece / Geç Öğün (20:00–01:00)',
    shortLabel: 'Gece (20:00+)',
    minHour: 20,
    maxHour: 25,
    ticks: [20, 21, 22, 23, 24, 25],
  },
};

export const MAX_TIMELINE_POINTS = 120;

export interface MealTimelinePoint {
  id: string;
  dateStr: string;
  timeHHMM: string;
  hourDecimal: number;
  maxSeverity: number;
  gerdMax: number;
  lprMax: number;
  dominantAxis: 'NONE' | 'LPR' | 'GERD' | 'MIXED';
  mealToSleepMinutes?: number;
  foodsLabel: string;
  symptomSummary: string;
  rawText: string;
  isLateMeal: boolean;
  bubbleSize: number;
}

export interface MealTimelineResult {
  points: MealTimelinePoint[];
  lprPoints: MealTimelinePoint[];
  gerdOrMixedPoints: MealTimelinePoint[];
  symptomFreePoints: MealTimelinePoint[];
  totalMatched: number;
  isCapped: boolean;
  summary: {
    mealCount: number;
    symptomMealCount: number;
    symptomRate: number | null;
    avgSeverity: number | null;
    lateMealSymptomRate: number | null;
  };
}

/**
 * Converts HH:MM meal times into a continuous clinical day clock [6.0 .. 25.0].
 * Hours 00:00..03:59 map to 24.0..27.99 (clamped to 25.0) so post-midnight
 * late snacks align naturally to the right of 23:00 on the evening axis.
 */
export function parseMealHourDecimal(timeHHMM: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeHHMM.trim());
  if (!match) return 12;
  const hh = Math.min(23, Math.max(0, Number(match[1])));
  const mm = Math.min(59, Math.max(0, Number(match[2])));
  const raw = hh + mm / 60;
  if (raw < 4) {
    return Math.min(25, Number((raw + 24).toFixed(2)));
  }
  return Math.max(6, Math.min(25, Number(raw.toFixed(2))));
}

export function formatHourTick(hourDecimal: number): string {
  const normalized = ((Math.round(hourDecimal) % 24) + 24) % 24;
  return `${String(normalized).padStart(2, '0')}:00`;
}

export function buildMealSymptomTimeline(
  logs: readonly RefluxLogEntry[],
  daySlice: TimelineDaySlice = 'all',
  foodFilterId: string = 'ALL',
  maxPoints: number = MAX_TIMELINE_POINTS
): MealTimelineResult {
  const domain = TIMELINE_DOMAINS[daySlice];
  const points: MealTimelinePoint[] = [];
  const lprPoints: MealTimelinePoint[] = [];
  const gerdOrMixedPoints: MealTimelinePoint[] = [];
  const symptomFreePoints: MealTimelinePoint[] = [];

  let totalMatched = 0;
  let symptomMealCount = 0;
  let severitySum = 0;
  let lateCount = 0;
  let lateSymptomCount = 0;

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    if (foodFilterId !== 'ALL') {
      let hasFood = false;
      for (let f = 0; f < log.foods.length; f++) {
        if (log.foods[f].matchedFoodId === foodFilterId) {
          hasFood = true;
          break;
        }
      }
      if (!hasFood) continue;
    }

    const hourDecimal = parseMealHourDecimal(log.timeHHMM);
    if (hourDecimal < domain.minHour || hourDecimal > domain.maxHour) {
      continue;
    }

    totalMatched += 1;

    let maxSeverity = 0;
    let gerdMax = 0;
    let lprMax = 0;
    const symptomParts: string[] = [];

    for (let s = 0; s < log.symptoms.length; s++) {
      const sym = log.symptoms[s];
      if (sym.severity > maxSeverity) maxSeverity = sym.severity;
      const meta = SYMPTOM_CATALOG[sym.code];
      if (meta?.axis === 'GERD' && sym.severity > gerdMax) gerdMax = sym.severity;
      if (meta?.axis === 'LPR' && sym.severity > lprMax) lprMax = sym.severity;
      if (meta) {
        symptomParts.push(`${meta.shortLabel} (${sym.severity}/5)`);
      }
    }

    const hadSymptom = maxSeverity > 0;
    if (hadSymptom) {
      symptomMealCount += 1;
      severitySum += maxSeverity;
    }

    const isLate = log.isLateMeal || hourDecimal >= 21;
    if (isLate) {
      lateCount += 1;
      if (hadSymptom) lateSymptomCount += 1;
    }

    if (points.length >= maxPoints) continue;

    let dominantAxis: MealTimelinePoint['dominantAxis'] = 'NONE';
    if (lprMax > 0 && gerdMax > 0) {
      dominantAxis = lprMax > gerdMax ? 'LPR' : gerdMax > lprMax ? 'GERD' : 'MIXED';
    } else if (lprMax > 0) {
      dominantAxis = 'LPR';
    } else if (gerdMax > 0) {
      dominantAxis = 'GERD';
    }

    const foodsLabel =
      log.foods.length > 0
        ? log.foods.map((f) => f.matchedFoodName ?? f.rawName).join(', ')
        : 'Besin belirtilmedi';

    const bubbleSize =
      typeof log.mealToSleepMinutes === 'number' && log.mealToSleepMinutes < 180
        ? 145
        : hadSymptom
          ? 110
          : 78;

    const pt: MealTimelinePoint = {
      id: log.id,
      dateStr: log.dateStr,
      timeHHMM: log.timeHHMM,
      hourDecimal,
      maxSeverity,
      gerdMax,
      lprMax,
      dominantAxis,
      mealToSleepMinutes: log.mealToSleepMinutes,
      foodsLabel,
      symptomSummary:
        symptomParts.length > 0 ? symptomParts.join(' · ') : 'Belirti yok',
      rawText: log.rawText,
      isLateMeal: isLate,
      bubbleSize,
    };

    points.push(pt);
    if (!hadSymptom) {
      symptomFreePoints.push(pt);
    } else if (dominantAxis === 'LPR') {
      lprPoints.push(pt);
    } else {
      gerdOrMixedPoints.push(pt);
    }
  }

  return {
    points,
    lprPoints,
    gerdOrMixedPoints,
    symptomFreePoints,
    totalMatched,
    isCapped: totalMatched > maxPoints,
    summary: {
      mealCount: totalMatched,
      symptomMealCount,
      symptomRate:
        totalMatched > 0 ? Math.round((symptomMealCount / totalMatched) * 100) : null,
      avgSeverity:
        symptomMealCount > 0
          ? Number((severitySum / symptomMealCount).toFixed(1))
          : null,
      lateMealSymptomRate:
        lateCount > 0 ? Math.round((lateSymptomCount / lateCount) * 100) : null,
    },
  };
}

// ============================================================================
// 7-Day Dashboard Mini Comparison: GERD vs. LPR Intensity & Trend Direction
// ============================================================================

export type TrendDirection = 'up' | 'down' | 'flat' | 'none';

export interface WeeklyAxisPoint {
  dateStr: string;
  label: string;
  shortWeekday: string;
  isToday: boolean;
  gerdIntensity: number;
  lprIntensity: number;
  logCount: number;
  gerdSymptoms: string[];
  lprSymptoms: string[];
}

export interface AxisTrendSummary {
  avg7d: number;
  earlierAvg: number;
  recentAvg: number;
  delta: number;
  direction: TrendDirection;
  peak7d: number;
}

export interface WeeklyAxisComparisonResult {
  points: WeeklyAxisPoint[];
  gerd: AxisTrendSummary;
  lpr: AxisTrendSummary;
  totalLogs7d: number;
  hasAnySymptoms: boolean;
}

function summarizeAxis(values: number[], hasLogs: boolean): AxisTrendSummary {
  const sumAll = values.reduce((acc, v) => acc + v, 0);
  const peak7d = values.reduce((m, v) => (v > m ? v : m), 0);
  const avg7d = Number((sumAll / 7).toFixed(1));

  // Compare earlier 4 days (0..3) vs recent 3 days (4..6)
  const earlierAvg = Number(
    ((values[0] + values[1] + values[2] + values[3]) / 4).toFixed(2)
  );
  const recentAvg = Number(((values[4] + values[5] + values[6]) / 3).toFixed(2));
  const delta = Number((recentAvg - earlierAvg).toFixed(1));

  let direction: TrendDirection = 'none';
  if (hasLogs && (sumAll > 0 || earlierAvg > 0 || recentAvg > 0)) {
    if (delta >= 0.3) {
      direction = 'up';
    } else if (delta <= -0.3) {
      direction = 'down';
    } else {
      direction = 'flat';
    }
  }

  return {
    avg7d,
    earlierAvg: Number(earlierAvg.toFixed(1)),
    recentAvg: Number(recentAvg.toFixed(1)),
    delta,
    direction,
    peak7d,
  };
}

/**
 * Computes a 7-day daily peak intensity series (0–5 scale) comparing
 * GERD vs. LPR symptoms and calculates recent-3-day vs. earlier-4-day trend deltas.
 */
export function buildWeeklyAxisComparison(
  logs: readonly RefluxLogEntry[],
  todayStr: string
): WeeklyAxisComparisonResult {
  const anchor = parseLocalDateStr(todayStr);
  const bucketMap = new Map<string, WeeklyAxisPoint>();
  const points: WeeklyAxisPoint[] = [];

  for (let offset = -6; offset <= 0; offset++) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() + offset);
    const dStr = formatLocalDateStr(d);
    const shortWeekday = offset === 0 ? 'Bugün' : WEEKDAY_SHORT_TR[d.getDay()];
    const dayNum = String(d.getDate()).padStart(2, '0');
    const pt: WeeklyAxisPoint = {
      dateStr: dStr,
      label: offset === 0 ? 'Bugün' : `${shortWeekday} ${dayNum}`,
      shortWeekday,
      isToday: offset === 0,
      gerdIntensity: 0,
      lprIntensity: 0,
      logCount: 0,
      gerdSymptoms: [],
      lprSymptoms: [],
    };
    points.push(pt);
    bucketMap.set(dStr, pt);
  }

  let totalLogs7d = 0;
  let hasAnySymptoms = false;

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const bucket = bucketMap.get(log.dateStr);
    if (!bucket) continue;

    bucket.logCount += 1;
    totalLogs7d += 1;

    for (let s = 0; s < log.symptoms.length; s++) {
      const sym = log.symptoms[s];
      const meta = SYMPTOM_CATALOG[sym.code];
      if (!meta) continue;
      if (sym.severity > 0) hasAnySymptoms = true;

      if (meta.axis === 'GERD') {
        if (sym.severity > bucket.gerdIntensity) {
          bucket.gerdIntensity = sym.severity;
        }
        if (!bucket.gerdSymptoms.includes(meta.shortLabel)) {
          bucket.gerdSymptoms.push(meta.shortLabel);
        }
      } else if (meta.axis === 'LPR') {
        if (sym.severity > bucket.lprIntensity) {
          bucket.lprIntensity = sym.severity;
        }
        if (!bucket.lprSymptoms.includes(meta.shortLabel)) {
          bucket.lprSymptoms.push(meta.shortLabel);
        }
      }
    }
  }

  const gerdValues = points.map((p) => p.gerdIntensity);
  const lprValues = points.map((p) => p.lprIntensity);

  return {
    points,
    gerd: summarizeAxis(gerdValues, totalLogs7d > 0),
    lpr: summarizeAxis(lprValues, totalLogs7d > 0),
    totalLogs7d,
    hasAnySymptoms,
  };
}

