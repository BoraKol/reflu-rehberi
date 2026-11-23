import {
  SYMPTOM_CATALOG,
  type AssessmentRecord,
  type DailyTrendPoint,
  type PersonalPattern,
  type PersonalPatternOccurrence,
  type RefluxLogEntry,
  type SleepGapComparison,
} from '../types/reflux';
import { clampInt } from '../lib/number';
import { formatLocalDateStr, parseLocalDateStr } from '../lib/time';
import { normalizeTurkishForMatch } from '../lib/turkish';

export const MIN_SAMPLE_SIZE = 3;

function formatSymptomSummary(entry: RefluxLogEntry): string {
  if (entry.symptoms.length === 0) return 'Belirti yok';
  return entry.symptoms
    .map((s) => `${SYMPTOM_CATALOG[s.code]?.shortLabel ?? s.code} (${s.severity}/5)`)
    .join(', ');
}

function getEntryMaxSeverity(entry: RefluxLogEntry): number {
  let max = 0;
  for (let i = 0; i < entry.symptoms.length; i++) {
    const sev = entry.symptoms[i].severity;
    if (sev > max) max = sev;
  }
  return max;
}

function isLateMealEntry(entry: RefluxLogEntry): boolean {
  if (entry.isLateMeal) return true;
  const colonIdx = entry.timeHHMM.indexOf(':');
  const hour = Number(
    colonIdx === -1 ? entry.timeHHMM : entry.timeHHMM.slice(0, colonIdx)
  );
  return Number.isFinite(hour) && (hour >= 21 || hour < 4);
}

/**
 * Single-pass O(N) pure math correlation engine.
 * Enforces Minimum Sample Guard (>= 3 logged occurrences required before flagging a personal pattern).
 */
export function computePersonalPatterns(logs: RefluxLogEntry[]): PersonalPattern[] {
  if (logs.length === 0) return [];

  const patterns: PersonalPattern[] = [];

  const lateMealOccurrences: PersonalPatternOccurrence[] = [];
  let lateMealSymptomCount = 0;

  const shortGapOccurrences: PersonalPatternOccurrence[] = [];
  let shortGapSymptomCount = 0;

  const foodGroups = new Map<
    string,
    {
      label: string;
      symptomCount: number;
      occurrences: PersonalPatternOccurrence[];
    }
  >();

  // Single pass over logs: build one occurrence object per log and reuse it across matching buckets
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const hasFoods = log.foods.length > 0;
    const isLate = hasFoods && isLateMealEntry(log);
    const isShortGap =
      typeof log.mealToSleepMinutes === 'number' && log.mealToSleepMinutes < 180;

    if (!isLate && !isShortGap && !hasFoods) continue;

    const hadSymptom = log.symptoms.length > 0;
    const occurrence: PersonalPatternOccurrence = {
      dateStr: log.dateStr,
      timeHHMM: log.timeHHMM,
      rawText: log.rawText,
      hadSymptom,
      symptomSummary: formatSymptomSummary(log),
    };

    if (isLate) {
      lateMealOccurrences.push(occurrence);
      if (hadSymptom) lateMealSymptomCount += 1;
    }

    if (isShortGap) {
      shortGapOccurrences.push(occurrence);
      if (hadSymptom) shortGapSymptomCount += 1;
    }

    if (hasFoods) {
      const seenInLog = new Set<string>();
      for (let j = 0; j < log.foods.length; j++) {
        const food = log.foods[j];
        const groupKey = food.matchedFoodId
          ? `food:${food.matchedFoodId}`
          : `custom:${normalizeTurkishForMatch(food.rawName)}`;
        if (!groupKey || seenInLog.has(groupKey)) continue;
        seenInLog.add(groupKey);

        const existing = foodGroups.get(groupKey);
        if (existing) {
          existing.occurrences.push(occurrence);
          if (hadSymptom) existing.symptomCount += 1;
        } else {
          foodGroups.set(groupKey, {
            label: food.matchedFoodName ?? food.rawName,
            symptomCount: hadSymptom ? 1 : 0,
            occurrences: [occurrence],
          });
        }
      }
    }
  }

  // 1. Late meals (>= 21:00)
  if (lateMealOccurrences.length > 0) {
    const total = lateMealOccurrences.length;
    const ratio = Math.round((lateMealSymptomCount / total) * 100);
    const meets = total >= MIN_SAMPLE_SIZE;

    patterns.push({
      id: 'pattern-late-meal',
      key: 'late-meal-21',
      label: '21:00 Sonrası Geç Öğün',
      kind: 'LATE_MEAL',
      totalOccurrences: total,
      symptomOccurrences: lateMealSymptomCount,
      ratioPercent: ratio,
      meetsMinSample: meets,
      minSampleRequired: MIN_SAMPLE_SIZE,
      summaryText: meets
        ? `21:00 sonrası yemek yediğin ${total} gecenin ${lateMealSymptomCount}'ünde (%${ratio}) belirti kaydettin.`
        : `Örüntü tespiti için en az ${MIN_SAMPLE_SIZE} kayıt gerekli (Mevcut: ${total}/${MIN_SAMPLE_SIZE}).`,
      occurrences: lateMealOccurrences,
    });
  }

  // 2. Short meal-to-sleep gap (< 3 hours)
  if (shortGapOccurrences.length > 0) {
    const total = shortGapOccurrences.length;
    const ratio = Math.round((shortGapSymptomCount / total) * 100);
    const meets = total >= MIN_SAMPLE_SIZE;

    patterns.push({
      id: 'pattern-short-gap',
      key: 'short-sleep-gap',
      label: 'Yemekten Sonra 3 Saatten Kısa Sürede Yatış',
      kind: 'SHORT_SLEEP_GAP',
      totalOccurrences: total,
      symptomOccurrences: shortGapSymptomCount,
      ratioPercent: ratio,
      meetsMinSample: meets,
      minSampleRequired: MIN_SAMPLE_SIZE,
      summaryText: meets
        ? `Yemek–uyku aralığının 3 saatin altında kaldığı ${total} kaydın ${shortGapSymptomCount}'ünde (%${ratio}) belirti görüldü.`
        : `Örüntü tespiti için en az ${MIN_SAMPLE_SIZE} kayıt gerekli (Mevcut: ${total}/${MIN_SAMPLE_SIZE}).`,
      occurrences: shortGapOccurrences,
    });
  }

  // 3. Per-food patterns
  for (const [key, group] of foodGroups.entries()) {
    const total = group.occurrences.length;
    const ratio = Math.round((group.symptomCount / total) * 100);
    const meets = total >= MIN_SAMPLE_SIZE;

    patterns.push({
      id: `pattern-${key}`,
      key,
      label: group.label,
      kind: 'FOOD',
      totalOccurrences: total,
      symptomOccurrences: group.symptomCount,
      ratioPercent: ratio,
      meetsMinSample: meets,
      minSampleRequired: MIN_SAMPLE_SIZE,
      summaryText: meets
        ? `${group.label} kaydettiğin ${total} günün ${group.symptomCount}'ünde (%${ratio}) belirti eşlik etti.`
        : `Örüntü tespiti için en az ${MIN_SAMPLE_SIZE} kayıt gerekli (Mevcut: ${total}/${MIN_SAMPLE_SIZE}).`,
      occurrences: group.occurrences,
    });
  }

  // Sort: sufficient sample first, then higher ratio, then higher occurrence count
  return patterns.sort((a, b) => {
    if (a.meetsMinSample !== b.meetsMinSample) return a.meetsMinSample ? -1 : 1;
    if (b.ratioPercent !== a.ratioPercent) return b.ratioPercent - a.ratioPercent;
    return b.totalOccurrences - a.totalOccurrences;
  });
}

export function getFoodPersonalHistory(
  logs: RefluxLogEntry[],
  foodIdOrRawName: string,
  isFoodId = true
): {
  totalCount: number;
  symptomCount: number;
  ratioPercent: number;
  meetsMinSample: boolean;
  label: string;
} {
  const normTarget = isFoodId ? '' : normalizeTurkishForMatch(foodIdOrRawName);
  let totalCount = 0;
  let symptomCount = 0;

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    let matched = false;
    for (let j = 0; j < log.foods.length; j++) {
      const f = log.foods[j];
      if (
        isFoodId
          ? f.matchedFoodId === foodIdOrRawName
          : normalizeTurkishForMatch(f.rawName) === normTarget
      ) {
        matched = true;
        break;
      }
    }
    if (matched) {
      totalCount += 1;
      if (log.symptoms.length > 0) symptomCount += 1;
    }
  }

  const ratioPercent = totalCount > 0 ? Math.round((symptomCount / totalCount) * 100) : 0;
  const meetsMinSample = totalCount >= MIN_SAMPLE_SIZE;

  let label: string;
  if (totalCount === 0) {
    label = 'Henüz kişisel kaydın yok';
  } else if (!meetsMinSample) {
    label = `${totalCount} kayıtta ${symptomCount} belirti (Örüntü için ${totalCount}/${MIN_SAMPLE_SIZE})`;
  } else {
    label = `${totalCount} kayıtta ${symptomCount} belirti (%${ratioPercent})`;
  }

  return { totalCount, symptomCount, ratioPercent, meetsMinSample, label };
}

export function computeSleepGapComparison(logs: RefluxLogEntry[]): SleepGapComparison {
  let withGapCount = 0;
  let totalGapMinutes = 0;

  let shortGapCount = 0;
  let shortGapWithSym = 0;
  let shortGapSeveritySum = 0;

  let safeGapCount = 0;
  let safeGapWithSym = 0;
  let safeGapSeveritySum = 0;

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const gap = log.mealToSleepMinutes;
    if (typeof gap !== 'number') continue;

    withGapCount += 1;
    totalGapMinutes += gap;
    const hasSym = log.symptoms.length > 0;
    const maxSev = hasSym ? getEntryMaxSeverity(log) : 0;

    if (gap < 180) {
      shortGapCount += 1;
      if (hasSym) shortGapWithSym += 1;
      shortGapSeveritySum += maxSev;
    } else {
      safeGapCount += 1;
      if (hasSym) safeGapWithSym += 1;
      safeGapSeveritySum += maxSev;
    }
  }

  return {
    shortGapCount,
    shortGapAvgSeverity:
      shortGapCount > 0
        ? Number((shortGapSeveritySum / shortGapCount).toFixed(1))
        : null,
    shortGapSymptomRate:
      shortGapCount > 0
        ? Math.round((shortGapWithSym / shortGapCount) * 100)
        : null,
    safeGapCount,
    safeGapAvgSeverity:
      safeGapCount > 0
        ? Number((safeGapSeveritySum / safeGapCount).toFixed(1))
        : null,
    safeGapSymptomRate:
      safeGapCount > 0
        ? Math.round((safeGapWithSym / safeGapCount) * 100)
        : null,
    avgMealToSleepMinutes:
      withGapCount > 0 ? Math.round(totalGapMinutes / withGapCount) : null,
  };
}

export function computeDailyTrends(
  logs: RefluxLogEntry[],
  range: 14 | 30 | 90 | 'all'
): DailyTrendPoint[] {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  let days: number;
  if (range === 'all') {
    let earliestDateStr = '';
    for (let i = 0; i < logs.length; i++) {
      const ds = logs[i].dateStr;
      if (ds && (!earliestDateStr || ds < earliestDateStr)) {
        earliestDateStr = ds;
      }
    }
    if (!earliestDateStr) {
      days = 14;
    } else {
      const earliest = parseLocalDateStr(earliestDateStr);
      const diffDays = Math.floor((today.getTime() - earliest.getTime()) / 86_400_000) + 1;
      days = clampInt(diffDays, 14, 3650, 14);
    }
  } else {
    days = range;
  }

  const points: DailyTrendPoint[] = new Array(days);
  const pointByDate = new Map<string, DailyTrendPoint>();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = formatLocalDateStr(d);
    const mm = dateStr.slice(5, 7);
    const dd = dateStr.slice(8, 10);
    const point: DailyTrendPoint = {
      dateStr,
      label: `${dd}.${mm}`,
      gerdScore: 0,
      lprScore: 0,
      logCount: 0,
    };
    points[days - 1 - i] = point;
    pointByDate.set(dateStr, point);
  }

  // Single O(N) pass: only accumulate logs that fall inside the active window
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const bucket = pointByDate.get(log.dateStr);
    if (!bucket) continue;

    bucket.logCount += 1;
    for (let j = 0; j < log.symptoms.length; j++) {
      const s = log.symptoms[j];
      const axis = SYMPTOM_CATALOG[s.code]?.axis;
      if (axis === 'GERD') bucket.gerdScore += s.severity;
      else if (axis === 'LPR') bucket.lprScore += s.severity;
    }
  }

  return points;
}

export function evaluateAssessment(
  rsiAnswers: number[],
  gerdqAnswers: number[]
): Omit<AssessmentRecord, 'id' | 'timestamp' | 'dateStr'> {
  const safeRsi = rsiAnswers.slice(0, 9).map((v) => clampInt(v, 0, 5));
  const safeGerdq = gerdqAnswers.slice(0, 6).map((v) => clampInt(v, 0, 3));

  const rsiTotal = safeRsi.reduce((sum, v) => sum + v, 0);
  const rsiSwallowingScore = safeRsi[3] ?? 0; // Item 4 (index 3)

  // GerdQ weekly burden score: sum of frequency indices (0..3) across 6 items -> 0..18
  const gerdqBurdenScore = safeGerdq.reduce((sum, v) => sum + v, 0);
  const gerdqHeartburnFreqIndex = safeGerdq[0] ?? 0;
  const gerdqRegurgFreqIndex = safeGerdq[1] ?? 0;

  const highLpr = rsiTotal > 13;
  // Classic GERD frequent if heartburn/regurg >= 2-3 days/wk (index >= 2) or total burden >= 6
  const highGerd =
    gerdqHeartburnFreqIndex >= 2 || gerdqRegurgFreqIndex >= 2 || gerdqBurdenScore >= 6;

  let profileType: AssessmentRecord['profileType'];
  if (highLpr && highGerd) {
    profileType = 'MIXED';
  } else if (highLpr && !highGerd) {
    profileType = 'LPR_DOMINANT';
  } else if (!highLpr && highGerd) {
    profileType = 'GERD_DOMINANT';
  } else {
    profileType = 'LOW_SYMPTOM';
  }

  return {
    rsiAnswers: safeRsi,
    rsiTotal,
    rsiSwallowingScore,
    gerdqAnswers: safeGerdq,
    gerdqBurdenScore,
    gerdqHeartburnFreqIndex,
    gerdqRegurgFreqIndex,
    profileType,
  };
}
