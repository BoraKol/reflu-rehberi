import { formatClockHHMM } from '../lib/time';

export type BrowserNotificationStatus =
  | 'default'
  | 'granted'
  | 'denied'
  | 'unsupported';

export type SleepReminderMilestone =
  | 'approaching30'
  | 'approaching15'
  | 'safeReached';

export interface BrowserNotificationPayload {
  title: string;
  body?: string;
  tag?: string;
  icon?: string;
}

export interface SleepReminderEvent {
  milestone: SleepReminderMilestone;
  title: string;
  description: string;
  variant: 'reminder' | 'warning' | 'success';
  tag: string;
}

export interface NotificationConstructorLike {
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  new (title: string, options?: NotificationOptions): unknown;
}

function resolveNotificationApi(
  override?: NotificationConstructorLike | null
): NotificationConstructorLike | null {
  if (override !== undefined) return override;
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }
  return window.Notification as unknown as NotificationConstructorLike;
}

export function getNotificationPermissionStatus(
  apiOverride?: NotificationConstructorLike | null
): BrowserNotificationStatus {
  const api = resolveNotificationApi(apiOverride);
  if (!api) return 'unsupported';
  if (
    api.permission === 'granted' ||
    api.permission === 'denied' ||
    api.permission === 'default'
  ) {
    return api.permission;
  }
  return 'unsupported';
}

export async function requestNotificationPermission(
  apiOverride?: NotificationConstructorLike | null
): Promise<BrowserNotificationStatus> {
  const api = resolveNotificationApi(apiOverride);
  if (!api || typeof api.requestPermission !== 'function') {
    return 'unsupported';
  }
  try {
    const result = await api.requestPermission();
    if (result === 'granted' || result === 'denied' || result === 'default') {
      return result;
    }
    return 'unsupported';
  } catch {
    return getNotificationPermissionStatus(apiOverride);
  }
}

export function sendBrowserNotification(
  payload: BrowserNotificationPayload,
  apiOverride?: NotificationConstructorLike | null
): boolean {
  const api = resolveNotificationApi(apiOverride);
  if (!api || api.permission !== 'granted') return false;
  try {
    new api(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: payload.icon ?? '/app-icon.png',
      badge: '/favicon.png',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Pure evaluator for Yemek–Uyku Kalkanı reminder milestones.
 * Fires once per milestone (tracked in memory via `sentMilestones`):
 * - 30 min remaining: "Yatış saatin yaklaşıyor (30 dk kaldı)"
 * - 15 min remaining: "Yatış saatin yaklaşıyor (15 dk kaldı)"
 * - 0 min remaining:  "Güvenli yatış saati başladı"
 */
export function evaluateSleepShieldReminder(
  lastMealTimestamp: number | null,
  windowHours: 3 | 4,
  nowMs: number,
  sentMilestones: ReadonlySet<SleepReminderMilestone>
): SleepReminderEvent | null {
  if (!lastMealTimestamp) return null;

  const safeBedtimeMs = lastMealTimestamp + windowHours * 3600 * 1000;
  const remainingMs = Math.max(0, safeBedtimeMs - nowMs);
  const safeClock = formatClockHHMM(safeBedtimeMs);

  if (remainingMs === 0) {
    if (sentMilestones.has('safeReached')) return null;
    return {
      milestone: 'safeReached',
      title: 'Güvenli yatış saati başladı',
      description: `${windowHours} saatlik Yemek–Uyku Kalkanı tamamlandı (${safeClock}). Artık güvenle uzanabilirsiniz.`,
      variant: 'success',
      tag: 'reflu-sleep-safe',
    };
  }

  const fifteenMinMs = 15 * 60 * 1000;
  if (remainingMs <= fifteenMinMs) {
    if (sentMilestones.has('approaching15')) return null;
    return {
      milestone: 'approaching15',
      title: 'Yatış saatin yaklaşıyor (15 dk kaldı)',
      description: `Güvenli yatış saatine (${safeClock}) 15 dakika kaldı. Sol yan yatış ve yüksek yastık gece reflüsünü azaltmaya yardımcı olur.`,
      variant: 'reminder',
      tag: 'reflu-sleep-15m',
    };
  }

  const thirtyMinMs = 30 * 60 * 1000;
  if (remainingMs <= thirtyMinMs) {
    if (sentMilestones.has('approaching30')) return null;
    return {
      milestone: 'approaching30',
      title: 'Yatış saatin yaklaşıyor (30 dk kaldı)',
      description: `Güvenli yatış saatine (${safeClock}) 30 dakika kaldı. Dik konumda kalmaya devam edin ve yeni atıştırmalık tüketmeyin.`,
      variant: 'reminder',
      tag: 'reflu-sleep-30m',
    };
  }

  return null;
}

export function createSampleBedtimeReminder(
  safeBedtimeMs: number | null
): Omit<SleepReminderEvent, 'milestone'> {
  const targetClock = safeBedtimeMs
    ? formatClockHHMM(safeBedtimeMs)
    : formatClockHHMM(Date.now() + 15 * 60 * 1000);
  return {
    title: 'Yatış saatin yaklaşıyor',
    description: `Güvenli yatış saatinize (${targetClock}) 15 dakika kaldı. Dik konumda kalmaya devam edin; gece reflüsünü azaltmak için sol yan yatış önerilir.`,
    variant: 'reminder',
    tag: 'reflu-sleep-preview',
  };
}
