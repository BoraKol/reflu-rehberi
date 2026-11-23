import { useEffect, useRef } from 'react';
import type { SleepShieldState } from '../types/reflux';
import {
  evaluateSleepShieldReminder,
  type SleepReminderMilestone,
} from '../utils/browserNotifications';
import type { ToastInput } from '../components/ToastProvider';

const CHECK_INTERVAL_MS = 15_000;

/**
 * Watches the active Yemek–Uyku Kalkanı countdown and dispatches each milestone
 * once. Pauses polling while the tab is hidden to save battery/CPU on mobile
 * devices and immediately re-checks when the user returns to the tab.
 */
export function useSleepShieldWatcher(
  sleepShield: SleepShieldState,
  notify: (toast: ToastInput) => void
): void {
  const sentMilestonesRef = useRef<Set<SleepReminderMilestone>>(new Set());
  const { lastMealTimestamp, windowHours } = sleepShield;

  useEffect(() => {
    sentMilestonesRef.current = new Set();
    if (!lastMealTimestamp) return;

    const checkMilestone = () => {
      const event = evaluateSleepShieldReminder(
        lastMealTimestamp,
        windowHours,
        Date.now(),
        sentMilestonesRef.current
      );
      if (event) {
        sentMilestonesRef.current.add(event.milestone);
        notify({
          title: event.title,
          description: event.description,
          variant: event.variant,
          browserAlert: true,
          tag: event.tag,
        });
      }
    };

    checkMilestone();
    const timer = window.setInterval(() => {
      if (!document.hidden) checkMilestone();
    }, CHECK_INTERVAL_MS);

    const onVisibility = () => {
      if (!document.hidden) checkMilestone();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [lastMealTimestamp, windowHours, notify]);
}
