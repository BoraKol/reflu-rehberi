import { computePersonalPatterns, MIN_SAMPLE_SIZE } from './correlationEngine';
import {
  formatLocalDateStr,
  parseLocalDateStr,
  shiftDateStr,
  WEEKDAY_SHORT_TR,
} from '../lib/time';
import { normalizeTurkishForMatch } from '../lib/turkish';
import type { PersonalPattern, RefluxLogEntry } from '../types/reflux';

export type MoodLevel = 'great' | 'balanced' | 'sensitive' | 'tough';

export interface MoodOption {
  id: MoodLevel;
  label: string;
  shortDesc: string;
  feedbackTitle: string;
  feedbackBody: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
  {
    id: 'great',
    label: 'Çok Rahat',
    shortDesc: 'Hafif ve sakin bir gün',
    feedbackTitle: 'Bugün rahat hissetmeni not ettik',
    feedbackBody:
      'Rahat geçen günleri ve öğün saatlerini kaydetmek, sana nelerin iyi geldiğini görmeni kolaylaştırır.',
  },
  {
    id: 'balanced',
    label: 'Dengeli',
    shortDesc: 'Genel olarak olağan akış',
    feedbackTitle: 'Dengeli bir gün kayda geçti',
    feedbackBody:
      'Olağan günlerde attığın kısa bir öğün notu bile 7 günlük ritim grafiğinin çok daha net görünmesini sağlar.',
  },
  {
    id: 'sensitive',
    label: 'Biraz Hassas',
    shortDesc: 'Hafif huzursuzluk var',
    feedbackTitle: 'Hassasiyet hissi işaretlendi',
    feedbackBody:
      'İstersen son öğün saatini ve içeceğini hızlıca not alabilirsin; böylece zaman çizginde hangi saatlerin öne çıktığını görebilirsin.',
  },
  {
    id: 'tough',
    label: 'Zorlayıcı',
    shortDesc: 'Belirgin rahatsızlık',
    feedbackTitle: 'Zorlayıcı bir gün olarak işaretlendi',
    feedbackBody:
      'Kendini yormadan yalnızca tek satırlık kısa bir not bırakabilirsin. Bu uygulama tıbbi tavsiye vermez; yalnızca kendi gözlemlerini düzenli tutmana yardımcı olur.',
  },
];

export interface DailyReflectionPrompt {
  id: string;
  question: string;
  starterText: string;
  contextLabel: string;
}

const DAILY_PROMPTS: DailyReflectionPrompt[] = [
  {
    id: 'lightest-meal',
    contextLabel: 'Günün Mini Sorusu',
    question: 'Bugün hangi öğünden sonra kendini en rahat hissettin?',
    starterText: 'Bugün en rahat hissettiğim öğün: ',
  },
  {
    id: 'last-drink',
    contextLabel: 'Günün Mini Sorusu',
    question: 'Son sıcak veya kafeinli içeceğini bugün saat kaçta içtin?',
    starterText: 'Bugün son içeceğimi saat ',
  },
  {
    id: 'dinner-timing',
    contextLabel: 'Günün Mini Sorusu',
    question: 'Akşam yemeğin bugün her zamankinden erken mi yoksa geç miydi?',
    starterText: 'Bugün akşam yemeğini saat ',
  },
  {
    id: 'new-food',
    contextLabel: 'Günün Mini Sorusu',
    question: 'Bugün farklı veya yeni denediğin bir yemek oldu mu?',
    starterText: 'Bugün denediğim farklı öğün: ',
  },
  {
    id: 'morning-feel',
    contextLabel: 'Günün Mini Sorusu',
    question: 'Sabah uyandığında kendini nasıl hissettiğini tek cümleyle özetler misin?',
    starterText: 'Sabah uyandığımda hissim: ',
  },
  {
    id: 'evening-pace',
    contextLabel: 'Günün Mini Sorusu',
    question: 'Bugün öğünlerden sonra kısa bir yürüyüş veya dinlenme molası verebildin mi?',
    starterText: 'Öğün sonrası rutinim: ',
  },
  {
    id: 'weekly-favorite',
    contextLabel: 'Günün Mini Sorusu',
    question: 'Son günlerde sana en iyi hissettiren öğün hangisiydi?',
    starterText: 'Son günlerde bana en rahat gelen öğün: ',
  },
];

export type RhythmDayTone = 'empty' | 'calm' | 'mild' | 'moderate' | 'high';

export interface RhythmDayBucket {
  dateStr: string;
  shortWeekday: string;
  dayNum: string;
  isToday: boolean;
  logCount: number;
  maxSeverity: number;
  tone: RhythmDayTone;
  foodsPreview: string[];
  entries: RefluxLogEntry[];
}

export interface DiscoveryMilestone {
  id: 'first-log' | 'three-day-rhythm' | 'first-pattern' | 'seven-day-panorama';
  title: string;
  detail: string;
  unlocked: boolean;
  current: number;
  target: number;
}

export interface EngagementSnapshot {
  currentStreakDays: number;
  loggedToday: boolean;
  uniqueLoggedDays: number;
  activeDaysLast7: number;
  calmDaysLast7: number;
  unlockedPatternCount: number;
  last7Days: RhythmDayBucket[];
  milestones: DiscoveryMilestone[];
  nextUnlockHint: string;
  timeGreeting: string;
}

export interface LogSaveFeedback {
  title: string;
  detail: string;
  badgeText: string;
  showDetectiveCta: boolean;
}

export function getTimeOfDayGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Günaydın';
  if (hour >= 12 && hour < 18) return 'İyi günler';
  if (hour >= 18 && hour < 23) return 'İyi akşamlar';
  return 'İyi geceler';
}

export function getDailyReflectionPrompt(dateStr: string): DailyReflectionPrompt {
  const d = parseLocalDateStr(dateStr);
  const startOfYear = new Date(d.getFullYear(), 0, 1, 12, 0, 0, 0);
  const dayIndex = Math.max(
    0,
    Math.floor((d.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
  );
  return DAILY_PROMPTS[dayIndex % DAILY_PROMPTS.length];
}

export function computeEngagementSnapshot(
  logs: RefluxLogEntry[],
  todayStr: string,
  currentHour = 12,
  precomputedPatterns?: readonly PersonalPattern[]
): EngagementSnapshot {
  const logsByDate = new Map<string, RefluxLogEntry[]>();
  for (let i = 0; i < logs.length; i++) {
    const entry = logs[i];
    const bucket = logsByDate.get(entry.dateStr);
    if (bucket) {
      bucket.push(entry);
    } else {
      logsByDate.set(entry.dateStr, [entry]);
    }
  }

  const uniqueLoggedDays = logsByDate.size;
  const loggedToday = logsByDate.has(todayStr);

  // Consecutive streak: anchor on today if logged today, else yesterday so morning users keep active streak
  let currentStreakDays = 0;
  let cursorDate = loggedToday ? todayStr : shiftDateStr(todayStr, -1);
  while (logsByDate.has(cursorDate) && currentStreakDays < 365) {
    currentStreakDays += 1;
    cursorDate = shiftDateStr(cursorDate, -1);
  }

  // Last 7 days visual rhythm buckets (oldest -> today)
  const last7Days: RhythmDayBucket[] = [];
  let activeDaysLast7 = 0;
  let calmDaysLast7 = 0;

  for (let offset = -6; offset <= 0; offset++) {
    const dStr = shiftDateStr(todayStr, offset);
    const dObj = parseLocalDateStr(dStr);
    const entries = logsByDate.get(dStr) ?? [];
    let maxSeverity = 0;
    const foodSet = new Set<string>();

    for (let j = 0; j < entries.length; j++) {
      const e = entries[j];
      for (let s = 0; s < e.symptoms.length; s++) {
        if (e.symptoms[s].severity > maxSeverity) {
          maxSeverity = e.symptoms[s].severity;
        }
      }
      for (let f = 0; f < e.foods.length; f++) {
        const label = e.foods[f].matchedFoodName ?? e.foods[f].rawName;
        if (label) foodSet.add(label);
      }
    }

    let tone: RhythmDayTone = 'empty';
    if (entries.length > 0) {
      activeDaysLast7 += 1;
      if (maxSeverity === 0) {
        tone = 'calm';
        calmDaysLast7 += 1;
      } else if (maxSeverity <= 2) {
        tone = 'mild';
      } else if (maxSeverity === 3) {
        tone = 'moderate';
      } else {
        tone = 'high';
      }
    }

    last7Days.push({
      dateStr: dStr,
      shortWeekday: WEEKDAY_SHORT_TR[dObj.getDay()],
      dayNum: String(dObj.getDate()).padStart(2, '0'),
      isToday: offset === 0,
      logCount: entries.length,
      maxSeverity,
      tone,
      foodsPreview: Array.from(foodSet).slice(0, 3),
      entries,
    });
  }

  const patterns = precomputedPatterns ?? computePersonalPatterns(logs);
  let unlockedPatternCount = 0;
  for (let i = 0; i < patterns.length; i++) {
    if (patterns[i].meetsMinSample) unlockedPatternCount += 1;
  }

  const milestones: DiscoveryMilestone[] = [
    {
      id: 'first-log',
      title: 'İlk Not',
      detail: 'Kişisel günlüğün başladı',
      unlocked: logs.length >= 1,
      current: Math.min(1, logs.length),
      target: 1,
    },
    {
      id: 'three-day-rhythm',
      title: '3 Günlük Ritim',
      detail: '3 farklı gün kaydı tamamlandı',
      unlocked: uniqueLoggedDays >= 3,
      current: Math.min(3, uniqueLoggedDays),
      target: 3,
    },
    {
      id: 'first-pattern',
      title: 'İlk Kişisel Örüntü',
      detail: 'En az 3 tekrarlı kişisel gözlem',
      unlocked: unlockedPatternCount >= 1,
      current: Math.min(1, unlockedPatternCount),
      target: 1,
    },
    {
      id: 'seven-day-panorama',
      title: '7 Günlük Panorama',
      detail: 'Haftalık zaman çizgisi netleşti',
      unlocked: uniqueLoggedDays >= 7,
      current: Math.min(7, uniqueLoggedDays),
      target: 7,
    },
  ];

  let nextUnlockHint: string;
  if (logs.length === 0) {
    nextUnlockHint =
      'İlk kısa öğün notunu ekle — 7 günlük kişisel ritim haritan anında canlansın.';
  } else if (uniqueLoggedDays < 3) {
    const remaining = 3 - uniqueLoggedDays;
    nextUnlockHint = `${uniqueLoggedDays}. gün kaydın tamam! ${remaining} farklı gün daha not aldığında 3 Günlük Ritim adımı açılacak.`;
  } else if (unlockedPatternCount === 0) {
    nextUnlockHint =
      'Harika bir ritim yakaladın — aynı besini veya geç öğünü 3 kez kaydettiğinde kişisel örüntün Dedektif ekranında görünür olacak.';
  } else if (uniqueLoggedDays < 7) {
    const remaining = 7 - uniqueLoggedDays;
    nextUnlockHint = `İlk kişisel örüntülerin açıldı! 7 Günlük Panorama için yalnızca ${remaining} farklı gün kaldı.`;
  } else {
    nextUnlockHint = `7 günlük ritmin hazır (${unlockedPatternCount} kişisel örüntü gözlemlendi) — Dedektif ekranında saat bazlı çizgini inceleyebilirsin.`;
  }

  return {
    currentStreakDays,
    loggedToday,
    uniqueLoggedDays,
    activeDaysLast7,
    calmDaysLast7,
    unlockedPatternCount,
    last7Days,
    milestones,
    nextUnlockHint,
    timeGreeting: getTimeOfDayGreeting(currentHour),
  };
}

/**
 * Generates warm, motivating, strictly non-medical instant feedback right after
 * the user saves a log entry, keeping Day 1 -> Day 2 -> Day 7 tracking engaging.
 */
export function buildLogSaveFeedback(
  newEntry: RefluxLogEntry,
  allLogsAfterSave: RefluxLogEntry[],
  todayStr: string
): LogSaveFeedback {
  // Compute patterns once and pass into snapshot (avoids double O(N) scan)
  const patterns = computePersonalPatterns(allLogsAfterSave);
  const snapshot = computeEngagementSnapshot(allLogsAfterSave, todayStr, 12, patterns);

  // Check if any food in the new entry just hit 2/3 (almost unlocked) or 3/3 (newly unlocked)
  if (newEntry.foods.length > 0) {
    const patternByKey = new Map(patterns.map((p) => [p.key, p]));
    for (let i = 0; i < newEntry.foods.length; i++) {
      const f = newEntry.foods[i];
      const key = f.matchedFoodId
        ? `food:${f.matchedFoodId}`
        : `custom:${normalizeTurkishForMatch(f.rawName)}`;
      const match = patternByKey.get(key);
      if (match && match.totalOccurrences === MIN_SAMPLE_SIZE) {
        return {
          title: `Yeni kişisel örüntü açıldı: ${match.label}`,
          detail: `${match.label} için ${MIN_SAMPLE_SIZE} kayda ulaştın. Artık Tetikleyici Dedektifi'nde kendi oranını (%${match.ratioPercent}) görebilirsin.`,
          badgeText: `${snapshot.currentStreakDays || 1} günlük takip`,
          showDetectiveCta: true,
        };
      }
      if (match && match.totalOccurrences === MIN_SAMPLE_SIZE - 1) {
        return {
          title: 'Kaydın eklendi — keşfe 1 adım kaldı',
          detail: `${match.label} besinini 2. kez not aldın. 1 kayıt daha eklediğinde kişisel örüntü özetin oluşacak.`,
          badgeText: `${match.totalOccurrences}/${MIN_SAMPLE_SIZE} gözlem`,
          showDetectiveCta: false,
        };
      }
    }
  }

  if (allLogsAfterSave.length === 1) {
    return {
      title: 'İlk kaydın eklendi, harika başlangıç!',
      detail:
        'Günlük 7 günlük ritim haritan artık canlı. Yarın tek bir kısa not daha eklediğinde 2 günlük serin başlayacak.',
      badgeText: '1. Gün Başladı',
      showDetectiveCta: false,
    };
  }

  if (newEntry.symptoms.length === 0) {
    return {
      title: 'Rahat geçen öğün kaydedildi',
      detail:
        'Belirtisiz geçen öğünleri not almak en az belirtili kayıtlar kadar değerlidir — sana iyi gelen düzeni netleştirir.',
      badgeText:
        snapshot.currentStreakDays > 1
          ? `${snapshot.currentStreakDays} günlük seri`
          : `${snapshot.activeDaysLast7}/7 aktif gün`,
      showDetectiveCta: snapshot.unlockedPatternCount > 0,
    };
  }

  if (snapshot.currentStreakDays >= 2) {
    return {
      title: `${snapshot.currentStreakDays}. gün serin devam ediyor`,
      detail:
        'Düzenli tuttuğun bu kısa gözlemler zaman çizginde saat ve besin ilişkilerini çok daha anlaşılır hale getiriyor.',
      badgeText: `${snapshot.currentStreakDays} gün üst üste`,
      showDetectiveCta: snapshot.unlockedPatternCount > 0,
    };
  }

  return {
    title: 'Gözlemin günlüğüne eklendi',
    detail: snapshot.nextUnlockHint,
    badgeText: `Toplam ${allLogsAfterSave.length} kayıt`,
    showDetectiveCta: snapshot.unlockedPatternCount > 0,
  };
}
