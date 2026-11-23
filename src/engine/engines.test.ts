import test from 'node:test';
import assert from 'node:assert/strict';
import { FOOD_DATABASE } from '../data/foodDatabase';
import { getFoodIconKey } from '../components/FoodIcon';
import { createDemoAssessments, createDemoLogs } from '../data/demoData';
import { buildExportPayload } from '../utils/storage';
import {
  applyReadabilityMode,
  getReadabilityAnnouncement,
  READABILITY_ATTR,
  READABILITY_HIGH,
} from '../utils/readability';
import {
  evaluateSleepShieldReminder,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  sendBrowserNotification,
  type NotificationConstructorLike,
  type SleepReminderMilestone,
} from '../utils/browserNotifications';
import { detectRedFlags } from './redFlagGuard';
import {
  matchFoodItem,
  parseTextOfflineFallback,
  scanIngredientsForTriggers,
} from './triggerEngine';
import {
  buildMealSymptomTimeline,
  buildWeeklyAxisComparison,
  DEFAULT_CHART_WINDOW_SIZE,
  filterTrendSeries,
  parseMealHourDecimal,
  sliceVisibilityWindow,
} from './chartWindow';
import {
  computeDailyTrends,
  computePersonalPatterns,
  computeSleepGapComparison,
  evaluateAssessment,
  MIN_SAMPLE_SIZE,
} from './correlationEngine';
import {
  buildLogSaveFeedback,
  computeEngagementSnapshot,
  getDailyReflectionPrompt,
} from './engagementEngine';
import { segmentAndFilterFoods } from './foodSegments';
import type { RefluxLogEntry } from '../types/reflux';

test('foodDatabase contains at least 55 verified Turkish & general foods and zero fabricated decimal pH numbers', () => {
  assert.ok(FOOD_DATABASE.length >= 55, `Expected >= 55 foods, got ${FOOD_DATABASE.length}`);
  for (const food of FOOD_DATABASE) {
    assert.ok(food.id && food.name && food.whyItMatters && food.evidenceBasis && food.personalReminder);
    assert.ok(food.mechanisms.length >= 1);
    // Ensure no fabricated decimal pH like "pH 4.2" appears anywhere in descriptions
    assert.equal(/\bpH\s*\d+(\.\d+)?/i.test(food.whyItMatters), false, `Found decimal pH in ${food.id}`);
    if (food.lprSpecificNote) {
      assert.equal(/\bpH\s*\d+(\.\d+)?/i.test(food.lprSpecificNote), false, `Found decimal pH in LPR note of ${food.id}`);
    }
  }
});

test('redFlagGuard detects emergency cardiac/bleeding alerts and urgent dysphagia alerts accurately', () => {
  const chestPain = detectRedFlags('Akşam baskı tarzı göğüs ağrısı ve nefes darlığı başladı');
  assert.equal(chestPain.hasRedFlag, true);
  assert.equal(chestPain.urgency, 'EMERGENCY');
  assert.ok(chestPain.signals.length >= 2);

  const bleeding = detectRedFlags('Sabah kahve telvesi görünümünde kusma ve siyah dışkı oldu');
  assert.equal(bleeding.hasRedFlag, true);
  assert.equal(bleeding.urgency, 'EMERGENCY');

  const dysphagia = detectRedFlags('Son haftalarda yutma güçlüğü ve lokma takılması yaşıyorum');
  assert.equal(dysphagia.hasRedFlag, true);
  assert.equal(dysphagia.urgency, 'URGENT_EVALUATION');

  const weightLoss = detectRedFlags('İstemsiz kilo kaybı ve ağrılı yutma hissediyorum');
  assert.equal(weightLoss.hasRedFlag, true);
  assert.equal(weightLoss.urgency, 'URGENT_EVALUATION');

  const normalReflux = detectRedFlags('Akşam 21:30 salçalı makarna ve demli çay içtim, hafif boğazda gıcık oldu');
  assert.equal(normalReflux.hasRedFlag, false);
  assert.equal(normalReflux.urgency, 'NONE');
});

test('triggerEngine normalizes Turkish characters (ç, ğ, ı, İ, ö, ş, ü) and NEVER guesses unknown foods', () => {
  const cigKofte = matchFoodItem('ÇİĞ KÖFTE');
  assert.equal(cigKofte.status, 'VERIFIED');
  assert.equal(cigKofte.matchedFoodId, 'cig-kofte');

  const isot = matchFoodItem('İsot');
  assert.equal(isot.status, 'VERIFIED');
  assert.equal(isot.matchedFoodId, 'aci-biber-isot');

  const ispanak = matchFoodItem('Ispanak');
  assert.equal(ispanak.status, 'VERIFIED');
  assert.equal(ispanak.matchedFoodId, 'ispanak');

  const salcaliCorba = matchFoodItem('Salçalı mercimek çorbası');
  assert.equal(salcaliCorba.status, 'VERIFIED');
  assert.equal(salcaliCorba.matchedFoodId, 'salcali-mercimek-corbasi');

  // Unknown item MUST remain UNVERIFIED_CUSTOM without guessed consensusLevel
  const unknown = matchFoodItem('Ejder meyveli chia pudingi');
  assert.equal(unknown.status, 'UNVERIFIED_CUSTOM');
  assert.equal(unknown.matchedFoodId, null);
  assert.equal(unknown.consensusLevel, undefined);
});

test('triggerEngine offline fallback extracts foods, HH:MM time, and LPR/GERD symptoms', () => {
  const parsed = parseTextOfflineFallback('Saat 21:30 gibi demli çay ve poğaça yedim, boğazda gıcık ve mide yanması oldu');
  assert.equal(parsed.timeHHMM, '21:30');
  assert.ok(parsed.foods.length >= 2);
  assert.ok(parsed.symptoms.some((s) => s.code === 'THROAT_IRRITATION'));
  assert.ok(parsed.symptoms.some((s) => s.code === 'HEARTBURN'));
});

test('scanIngredientsForTriggers detects verbatim Turkish/English ingredients and high fat threshold', () => {
  const result = scanIngredientsForTriggers(
    'Su, domates salçası (%18), şeker, asitlik düzenleyici (sitrik asit E330), soğan tozu, nane aroması.',
    21.4
  );
  assert.equal(result.highFatFlag, true);
  const ids = result.triggers.map((t) => t.triggerId);
  assert.ok(ids.includes('tomato-paste'));
  assert.ok(ids.includes('citric-acid'));
  assert.ok(ids.includes('onion-garlic'));
  assert.ok(ids.includes('mint-menthol'));
  assert.ok(ids.includes('high-fat-100g'));
  const citricMatch = result.triggers.find((t) => t.triggerId === 'citric-acid');
  assert.ok(citricMatch?.snippet.toLowerCase().includes('sitrik asit'));
});

test('correlationEngine enforces Minimum Sample Guard (< 3 occurrences) and computes exact X/Y ratios', () => {
  const smallLogs: RefluxLogEntry[] = [
    {
      id: '1',
      timestamp: '2026-11-20T21:30:00',
      dateStr: '2026-11-20',
      timeHHMM: '21:30',
      rawText: 'Türk kahvesi içtim',
      foods: [{ rawName: 'Türk kahvesi', matchedFoodId: 'turk-kahvesi', matchedFoodName: 'Türk Kahvesi', status: 'VERIFIED', consensusLevel: 'common_trigger' }],
      symptoms: [{ code: 'THROAT_CLEARING', severity: 3 }],
      source: 'manual',
    },
    {
      id: '2',
      timestamp: '2026-11-21T15:00:00',
      dateStr: '2026-11-21',
      timeHHMM: '15:00',
      rawText: 'Türk kahvesi içtim',
      foods: [{ rawName: 'Türk kahvesi', matchedFoodId: 'turk-kahvesi', matchedFoodName: 'Türk Kahvesi', status: 'VERIFIED', consensusLevel: 'common_trigger' }],
      symptoms: [{ code: 'THROAT_CLEARING', severity: 4 }],
      source: 'manual',
    },
  ];

  const smallPatterns = computePersonalPatterns(smallLogs);
  const coffeePattern = smallPatterns.find((p) => p.key === 'food:turk-kahvesi');
  assert.ok(coffeePattern);
  assert.equal(coffeePattern.totalOccurrences, 2);
  assert.equal(coffeePattern.meetsMinSample, false);
  assert.ok(coffeePattern.summaryText.includes(`2/${MIN_SAMPLE_SIZE}`));

  // Verify demo logs yield exact ratios on >= 3 occurrences
  const demoLogs = createDemoLogs();
  const demoPatterns = computePersonalPatterns(demoLogs);
  const lateMeal = demoPatterns.find((p) => p.key === 'late-meal-21');
  assert.ok(lateMeal);
  assert.equal(lateMeal.totalOccurrences, 5);
  assert.equal(lateMeal.symptomOccurrences, 4);
  assert.equal(lateMeal.ratioPercent, 80);
  assert.equal(lateMeal.meetsMinSample, true);

  const sleepComparison = computeSleepGapComparison(demoLogs);
  assert.ok(sleepComparison.shortGapCount >= 3);
  assert.ok(sleepComparison.safeGapCount >= 3);
  assert.ok((sleepComparison.shortGapSymptomRate ?? 0) > (sleepComparison.safeGapSymptomRate ?? 0));
});

test('evaluateAssessment distinguishes Silent Reflux (LPR_DOMINANT) when RSI > 13 and heartburn is low', () => {
  const result = evaluateAssessment(
    [3, 4, 3, 0, 2, 0, 2, 3, 1], // RSI = 18 > 13
    [1, 0, 0, 0, 0, 0] // Minimal classic GERD
  );
  assert.equal(result.rsiTotal, 18);
  assert.equal(result.profileType, 'LPR_DOMINANT');
  assert.equal(result.rsiSwallowingScore, 0);

  const withSwallowing = evaluateAssessment(
    [1, 2, 1, 4, 1, 0, 0, 2, 0], // Item 4 swallowing = 4 (>=3)
    [0, 0, 0, 0, 0, 0]
  );
  assert.equal(withSwallowing.rsiSwallowingScore, 4);
});

test('buildExportPayload produces valid JSON backup with accurate counts and privacy notice', () => {
  const logs = createDemoLogs();
  const assessments = createDemoAssessments();
  const payload = buildExportPayload(
    {
      logs,
      assessments,
      sleepShield: { lastMealTimestamp: null, windowHours: 3 },
      isDemoLoaded: true,
    },
    new Date('2026-11-23T10:00:00.000Z')
  );
  assert.equal(payload.app, 'ReflüRehber');
  assert.equal(payload.formatVersion, '1.0');
  assert.equal(payload.exportedAt, '2026-11-23T10:00:00.000Z');
  assert.equal(payload.summary.logCount, logs.length);
  assert.equal(payload.summary.assessmentCount, assessments.length);
  assert.ok(payload.privacyNotice.includes('şifrelenmemiş'));
  assert.ok(payload.privacyNotice.includes('veri gizliliği politikası'));
  assert.ok(payload.privacyNotice.includes('saklanmaz'));
  const roundTripped = JSON.parse(JSON.stringify(payload));
  assert.equal(roundTripped.data.logs.length, logs.length);
});

test('correlationEngine processes 2,000 logs in single-pass O(N) accurately and swiftly (< 250ms)', () => {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const largeLogs: RefluxLogEntry[] = Array.from({ length: 2000 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (i % 60));
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const isShort = i % 2 === 0;
    return {
      id: `bulk-${i}`,
      timestamp: `${dateStr}T${isShort ? '21:30' : '18:30'}:00`,
      dateStr,
      timeHHMM: isShort ? '21:30' : '18:30',
      mealToSleepMinutes: isShort ? 90 : 210,
      isLateMeal: isShort,
      rawText: isShort ? 'Demli çay ve çikolata' : 'Izgara tavuk ve yulaf',
      foods: [
        {
          rawName: isShort ? 'Demli çay' : 'Yulaf',
          matchedFoodId: isShort ? 'siyah-cay' : 'yulaf',
          matchedFoodName: isShort ? 'Demli Siyah Çay' : 'Yulaf',
          status: 'VERIFIED',
          consensusLevel: isShort ? 'common_trigger' : 'generally_tolerated',
        },
      ],
      symptoms: isShort ? [{ code: 'THROAT_CLEARING', severity: 3 }] : [],
      source: 'manual',
    };
  });

  const t0 = performance.now();
  const patterns = computePersonalPatterns(largeLogs);
  const sleep = computeSleepGapComparison(largeLogs);
  const trends30 = computeDailyTrends(largeLogs, 30);
  const elapsedMs = performance.now() - t0;

  assert.equal(sleep.shortGapCount, 1000);
  assert.equal(sleep.safeGapCount, 1000);
  assert.equal(sleep.shortGapSymptomRate, 100);
  assert.equal(sleep.safeGapSymptomRate, 0);
  assert.equal(trends30.length, 30);

  const teaPattern = patterns.find((p) => p.key === 'food:siyah-cay');
  assert.ok(teaPattern);
  assert.equal(teaPattern.totalOccurrences, 1000);
  assert.equal(teaPattern.symptomOccurrences, 1000);
  assert.equal(teaPattern.ratioPercent, 100);
  assert.ok(elapsedMs < 250, `Expected < 250ms for 2,000 logs, got ${elapsedMs.toFixed(1)}ms`);
});

test('readability mode helper toggles data-readability attribute cleanly without browser storage', () => {
  const attrs = new Map<string, string>();
  const mockTarget = {
    setAttribute: (k: string, v: string) => attrs.set(k, v),
    removeAttribute: (k: string) => attrs.delete(k),
  };

  applyReadabilityMode(mockTarget, true);
  assert.equal(attrs.get(READABILITY_ATTR), READABILITY_HIGH);

  const onMsg = getReadabilityAnnouncement(true);
  assert.ok(onMsg.title.includes('açıldı'));
  assert.ok(onMsg.description.includes('kontrast'));

  applyReadabilityMode(mockTarget, false);
  assert.equal(attrs.has(READABILITY_ATTR), false);

  const offMsg = getReadabilityAnnouncement(false);
  assert.ok(offMsg.title.includes('kapatıldı'));
});

test('evaluateSleepShieldReminder fires approaching bedtime (30m & 15m) and safe bedtime milestones once', () => {
  const mealTs = Date.UTC(2026, 10, 23, 18, 0, 0); // 18:00 UTC
  const sent = new Set<SleepReminderMilestone>();

  // 45 minutes remaining -> no reminder yet
  const at45m = evaluateSleepShieldReminder(mealTs, 3, mealTs + (135 * 60 * 1000), sent);
  assert.equal(at45m, null);

  // 25 minutes remaining -> 30m approaching reminder
  const at25m = evaluateSleepShieldReminder(mealTs, 3, mealTs + (155 * 60 * 1000), sent);
  assert.ok(at25m);
  assert.equal(at25m.milestone, 'approaching30');
  assert.ok(at25m.title.includes('Yatış saatin yaklaşıyor'));
  assert.equal(at25m.variant, 'reminder');
  sent.add(at25m.milestone);

  // Deduplicated on repeat check
  assert.equal(
    evaluateSleepShieldReminder(mealTs, 3, mealTs + (156 * 60 * 1000), sent),
    null
  );

  // 12 minutes remaining -> 15m approaching reminder
  const at12m = evaluateSleepShieldReminder(mealTs, 3, mealTs + (168 * 60 * 1000), sent);
  assert.ok(at12m);
  assert.equal(at12m.milestone, 'approaching15');
  assert.ok(at12m.title.includes('Yatış saatin yaklaşıyor'));
  sent.add(at12m.milestone);

  // 0 minutes remaining -> safe bedtime reached
  const atZero = evaluateSleepShieldReminder(mealTs, 3, mealTs + (180 * 60 * 1000), sent);
  assert.ok(atZero);
  assert.equal(atZero.milestone, 'safeReached');
  assert.equal(atZero.variant, 'success');
  sent.add(atZero.milestone);

  // Deduplicated after completion
  assert.equal(
    evaluateSleepShieldReminder(mealTs, 3, mealTs + (190 * 60 * 1000), sent),
    null
  );
});

test('browser notification helpers handle permission request, dispatch, and unsupported fallback safely', async () => {
  assert.equal(getNotificationPermissionStatus(null), 'unsupported');
  assert.equal(await requestNotificationPermission(null), 'unsupported');
  assert.equal(sendBrowserNotification({ title: 'Test' }, null), false);

  const dispatched: Array<{ title: string; options?: NotificationOptions }> = [];
  class MockNotification {
    static permission: NotificationPermission = 'default';
    static async requestPermission(): Promise<NotificationPermission> {
      MockNotification.permission = 'granted';
      return 'granted';
    }
    constructor(title: string, options?: NotificationOptions) {
      dispatched.push({ title, options });
    }
  }

  const api = MockNotification as unknown as NotificationConstructorLike;
  assert.equal(getNotificationPermissionStatus(api), 'default');
  assert.equal(sendBrowserNotification({ title: 'Blocked while default' }, api), false);

  const nextStatus = await requestNotificationPermission(api);
  assert.equal(nextStatus, 'granted');
  assert.equal(getNotificationPermissionStatus(api), 'granted');

  const ok = sendBrowserNotification(
    { title: 'Yatış saatin yaklaşıyor', body: '15 dk kaldı', tag: 'sleep-15m' },
    api
  );
  assert.equal(ok, true);
  assert.equal(dispatched.length, 1);
  assert.equal(dispatched[0].title, 'Yatış saatin yaklaşıyor');
  assert.equal(dispatched[0].options?.icon, '/app-icon.png');
});

test('chartWindow filters trend series accurately and enforces bounded sliding visibility windows', () => {
  const points = Array.from({ length: 90 }, (_, i) => ({
    dateStr: `2026-09-${String((i % 30) + 1).padStart(2, '0')}`,
    label: `${String((i % 30) + 1).padStart(2, '0')}.09`,
    gerdScore: i % 5 === 0 ? 4 : 0,
    lprScore: i % 3 === 0 ? 5 : 0,
    logCount: 1,
  }));

  // 1. Default visibility window caps rendered points to 30 anchored at latest
  const latestWin = sliceVisibilityWindow(points, 0, DEFAULT_CHART_WINDOW_SIZE);
  assert.equal(latestWin.isWindowed, true);
  assert.equal(latestWin.visiblePoints.length, 30);
  assert.equal(latestWin.startIndex, 60);
  assert.equal(latestWin.endIndex, 90);
  assert.equal(latestWin.canStepPrev, true);
  assert.equal(latestWin.canStepNext, false);

  // 2. Panning backward shifts window smoothly and clamps at 0
  const midWin = sliceVisibilityWindow(points, 30, DEFAULT_CHART_WINDOW_SIZE);
  assert.equal(midWin.startIndex, 30);
  assert.equal(midWin.endIndex, 60);
  assert.equal(midWin.canStepPrev, true);
  assert.equal(midWin.canStepNext, true);

  const clampedOldest = sliceVisibilityWindow(points, 999, DEFAULT_CHART_WINDOW_SIZE);
  assert.equal(clampedOldest.startIndex, 0);
  assert.equal(clampedOldest.endIndex, 30);
  assert.equal(clampedOldest.canStepPrev, false);
  assert.equal(clampedOldest.canStepNext, true);

  // 3. Axis & symptom-only filters narrow series without mutating source
  const lprOnly = filterTrendSeries(points, 'lpr', true);
  assert.equal(lprOnly.length, 30);
  assert.ok(lprOnly.every((p) => p.lprScore > 0));

  const gerdOnly = filterTrendSeries(points, 'gerd', true);
  assert.equal(gerdOnly.length, 18);
  assert.ok(gerdOnly.every((p) => p.gerdScore > 0));

  // 4. Small series (<= windowSize) disables windowing overhead
  const smallWin = sliceVisibilityWindow(gerdOnly, 0, DEFAULT_CHART_WINDOW_SIZE);
  assert.equal(smallWin.isWindowed, false);
  assert.equal(smallWin.visiblePoints.length, 18);
});

test('FoodIcon maps all 63 verified foods to pure Lucide-react royalty-free icon keys', () => {
  const usedKeys = new Set<string>();
  for (const food of FOOD_DATABASE) {
    const key = getFoodIconKey(food);
    assert.ok(key && key.length > 0, `Missing icon key for ${food.id}`);
    usedKeys.add(key);
  }
  assert.equal(getFoodIconKey({ id: 'havuc', category: 'Sebze & Meyve' }), 'carrot');
  assert.equal(getFoodIconKey({ id: 'demli-siyah-cay', category: 'İçecek' }), 'coffee');
  assert.equal(getFoodIconKey({ id: 'gazli-icecekler', category: 'İçecek' }), 'cup-soda');
  assert.equal(getFoodIconKey({ id: 'acili-ezme', category: 'Sos & Baharat' }), 'flame');
  assert.equal(getFoodIconKey({ id: 'domates-salcasi', category: 'Sos & Baharat' }), 'droplet');
  assert.ok(usedKeys.size >= 20, `Expected rich Lucide icon variety (>=20), got ${usedKeys.size}`);
});

test('buildMealSymptomTimeline maps meal times continuously, supports day-slice focusing, and caps large datasets', () => {
  assert.equal(parseMealHourDecimal('08:30'), 8.5);
  assert.equal(parseMealHourDecimal('21:30'), 21.5);
  assert.equal(parseMealHourDecimal('00:30'), 24.5);

  const demoLogs = createDemoLogs();
  const full = buildMealSymptomTimeline(demoLogs, 'all', 'ALL');
  assert.equal(full.totalMatched, demoLogs.length);
  assert.equal(full.isCapped, false);
  assert.ok(full.points.length === demoLogs.length);
  assert.ok(full.summary.symptomRate !== null && full.summary.symptomRate > 0);

  // Focusing on late night (20:00–01:00) filters cleanly
  const lateOnly = buildMealSymptomTimeline(demoLogs, 'late', 'ALL');
  assert.ok(lateOnly.points.length > 0);
  assert.ok(lateOnly.points.every((p) => p.hourDecimal >= 20 && p.hourDecimal <= 25));

  // Large dataset capping preserves performance
  const bulk: RefluxLogEntry[] = Array.from({ length: 300 }, (_, i) => ({
    id: `tl-${i}`,
    timestamp: '2026-11-20T21:15:00',
    dateStr: '2026-11-20',
    timeHHMM: '21:15',
    isLateMeal: true,
    rawText: 'Geç akşam yemeği',
    foods: [],
    symptoms: i % 2 === 0 ? [{ code: 'HEARTBURN', severity: 4 }] : [],
    source: 'manual',
  }));
  const capped = buildMealSymptomTimeline(bulk, 'late', 'ALL', 120);
  assert.equal(capped.totalMatched, 300);
  assert.equal(capped.points.length, 120);
  assert.equal(capped.isCapped, true);
  assert.equal(capped.summary.symptomRate, 50);
});

test('engagementEngine computes 7-day rhythm, active streak, milestones, daily prompt, and non-medical feedback', () => {
  const promptA = getDailyReflectionPrompt('2026-11-23');
  const promptB = getDailyReflectionPrompt('2026-11-24');
  assert.ok(promptA.question.length > 10 && promptA.starterText.length > 5);
  assert.notEqual(promptA.id, promptB.id);

  // Empty logs state
  const emptySnap = computeEngagementSnapshot([], '2026-11-23', 9);
  assert.equal(emptySnap.currentStreakDays, 0);
  assert.equal(emptySnap.activeDaysLast7, 0);
  assert.equal(emptySnap.last7Days.length, 7);
  assert.equal(emptySnap.timeGreeting, 'Günaydın');
  assert.equal(emptySnap.milestones.filter((m) => m.unlocked).length, 0);

  // 3 consecutive days ending today with 1 calm day and 2 symptom days
  const sampleLogs: RefluxLogEntry[] = [
    {
      id: 'e1',
      timestamp: '2026-11-21T19:00:00',
      dateStr: '2026-11-21',
      timeHHMM: '19:00',
      rawText: 'Yulaf ve muz',
      foods: [{ rawName: 'Yulaf', matchedFoodId: 'yulaf', matchedFoodName: 'Yulaf', status: 'VERIFIED', consensusLevel: 'generally_tolerated' }],
      symptoms: [],
      source: 'manual',
    },
    {
      id: 'e2',
      timestamp: '2026-11-22T21:15:00',
      dateStr: '2026-11-22',
      timeHHMM: '21:15',
      rawText: 'Demli çay',
      foods: [{ rawName: 'Demli çay', matchedFoodId: 'siyah-cay', matchedFoodName: 'Demli Siyah Çay', status: 'VERIFIED', consensusLevel: 'common_trigger' }],
      symptoms: [{ code: 'THROAT_CLEARING', severity: 3 }],
      source: 'manual',
    },
    {
      id: 'e3',
      timestamp: '2026-11-23T18:30:00',
      dateStr: '2026-11-23',
      timeHHMM: '18:30',
      rawText: 'Demli çay içtim',
      foods: [{ rawName: 'Demli çay', matchedFoodId: 'siyah-cay', matchedFoodName: 'Demli Siyah Çay', status: 'VERIFIED', consensusLevel: 'common_trigger' }],
      symptoms: [{ code: 'THROAT_IRRITATION', severity: 2 }],
      source: 'manual',
    },
  ];

  const snap = computeEngagementSnapshot(sampleLogs, '2026-11-23', 19);
  assert.equal(snap.currentStreakDays, 3);
  assert.equal(snap.activeDaysLast7, 3);
  assert.equal(snap.calmDaysLast7, 1);
  assert.equal(snap.timeGreeting, 'İyi akşamlar');
  assert.equal(snap.milestones.find((m) => m.id === 'first-log')?.unlocked, true);
  assert.equal(snap.milestones.find((m) => m.id === 'three-day-rhythm')?.unlocked, true);

  // Feedback on 2nd occurrence of a food encourages logging 1 more to unlock personal pattern
  const fb = buildLogSaveFeedback(sampleLogs[2], sampleLogs, '2026-11-23');
  assert.ok(fb.detail.includes('Demli Siyah Çay'));
  assert.ok(fb.badgeText.includes('2/3'));
});

test('buildWeeklyAxisComparison compares 7-day GERD vs LPR intensity and detects upward/downward trends', () => {
  const logs: RefluxLogEntry[] = [
    // Earlier 4 days (Nov 17..20): high LPR (4), low GERD (0)
    {
      id: 'w1',
      timestamp: '2026-11-18T21:30:00',
      dateStr: '2026-11-18',
      timeHHMM: '21:30',
      rawText: 'Ses kısıklığı',
      foods: [],
      symptoms: [{ code: 'HOARSENESS', severity: 4 }],
      source: 'manual',
    },
    {
      id: 'w2',
      timestamp: '2026-11-19T21:45:00',
      dateStr: '2026-11-19',
      timeHHMM: '21:45',
      rawText: 'Boğaz temizleme',
      foods: [],
      symptoms: [{ code: 'THROAT_CLEARING', severity: 4 }],
      source: 'manual',
    },
    // Recent 3 days (Nov 21..23): LPR decreased (1), GERD increased (4)
    {
      id: 'w3',
      timestamp: '2026-11-22T20:00:00',
      dateStr: '2026-11-22',
      timeHHMM: '20:00',
      rawText: 'Mide yanması',
      foods: [],
      symptoms: [
        { code: 'HEARTBURN', severity: 4 },
        { code: 'THROAT_IRRITATION', severity: 1 },
      ],
      source: 'manual',
    },
    {
      id: 'w4',
      timestamp: '2026-11-23T19:00:00',
      dateStr: '2026-11-23',
      timeHHMM: '19:00',
      rawText: 'Ağza acı su',
      foods: [],
      symptoms: [{ code: 'REGURGITATION', severity: 3 }],
      source: 'manual',
    },
  ];

  const res = buildWeeklyAxisComparison(logs, '2026-11-23');
  assert.equal(res.points.length, 7);
  assert.equal(res.totalLogs7d, 4);
  assert.equal(res.hasAnySymptoms, true);
  assert.equal(res.lpr.direction, 'down');
  assert.ok(res.lpr.delta < 0);
  assert.equal(res.gerd.direction, 'up');
  assert.ok(res.gerd.delta > 0);
  assert.equal(res.points[6].isToday, true);
  assert.equal(res.points[6].gerdIntensity, 3);
});

test('segmentAndFilterFoods automatically partitions foods into 3 ordered categories with accurate live counts', () => {
  const all = segmentAndFilterFoods(FOOD_DATABASE, {
    searchQuery: '',
    consensusFilter: 'ALL',
    mechanismFilter: 'ALL',
  });
  assert.equal(all.counts.total, FOOD_DATABASE.length);
  assert.equal(all.segments.length, 3);
  assert.deepEqual(
    all.segments.map((s) => s.id),
    ['generally_tolerated', 'individual_varies', 'common_trigger']
  );
  assert.equal(
    all.counts.generally_tolerated +
      all.counts.individual_varies +
      all.counts.common_trigger,
    FOOD_DATABASE.length
  );
  assert.equal(all.flatItems.length, FOOD_DATABASE.length);

  // Percentage shares sum cleanly to 100 when foods exist
  assert.equal(
    all.percentages.generally_tolerated +
      all.percentages.individual_varies +
      all.percentages.common_trigger,
    100
  );

  // Focusing on one segment preserves cross-segment counts while narrowing displayed list
  const toleratedOnly = segmentAndFilterFoods(FOOD_DATABASE, {
    searchQuery: '',
    consensusFilter: 'generally_tolerated',
    mechanismFilter: 'ALL',
  });
  assert.equal(toleratedOnly.segments.length, 1);
  assert.equal(toleratedOnly.segments[0].id, 'generally_tolerated');
  assert.equal(toleratedOnly.flatItems.length, all.counts.generally_tolerated);
  assert.equal(toleratedOnly.counts.common_trigger, all.counts.common_trigger);

  // Turkish search narrows counts accurately and omits empty segments
  const tomatoSearch = segmentAndFilterFoods(FOOD_DATABASE, {
    searchQuery: 'domates',
    consensusFilter: 'ALL',
    mechanismFilter: 'ALL',
  });
  assert.ok(tomatoSearch.counts.total >= 2);
  assert.ok(tomatoSearch.segments.every((s) => s.count > 0));
  assert.equal(
    tomatoSearch.percentages.generally_tolerated +
      tomatoSearch.percentages.individual_varies +
      tomatoSearch.percentages.common_trigger,
    100
  );

  // Zero-match search yields 0 percentages and 0 segments
  const emptySearch = segmentAndFilterFoods(FOOD_DATABASE, {
    searchQuery: 'zzzz-olmayan-besin',
    consensusFilter: 'ALL',
    mechanismFilter: 'ALL',
  });
  assert.equal(emptySearch.counts.total, 0);
  assert.equal(emptySearch.segments.length, 0);
  assert.deepEqual(emptySearch.percentages, {
    generally_tolerated: 0,
    individual_varies: 0,
    common_trigger: 0,
  });
});
