import { useCallback, useEffect, useState } from 'react';
import {
  applyReadabilityMode,
  getReadabilityAnnouncement,
} from '../utils/readability';
import type { ToastInput } from '../components/ToastProvider';

export function useReadabilityMode(notify: (toast: ToastInput) => void) {
  const [readabilityMode, setReadabilityMode] = useState(false);

  useEffect(() => {
    applyReadabilityMode(document.documentElement, readabilityMode);
    return () => {
      applyReadabilityMode(document.documentElement, false);
    };
  }, [readabilityMode]);

  const toggleReadabilityMode = useCallback(() => {
    setReadabilityMode((prev) => {
      const next = !prev;
      const msg = getReadabilityAnnouncement(next);
      notify({
        title: msg.title,
        description: msg.description,
        variant: 'info',
      });
      return next;
    });
  }, [notify]);

  return { readabilityMode, toggleReadabilityMode };
}
