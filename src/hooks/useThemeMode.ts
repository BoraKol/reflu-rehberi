import { useCallback, useEffect, useState } from 'react';
import {
  applyThemeMode,
  getInitialThemeMode,
  getThemeAnnouncement,
  syncThemeColorMeta,
  type ThemeMode,
} from '../utils/theme';
import type { ToastInput } from '../components/ToastProvider';

export function useThemeMode(notify: (toast: ToastInput) => void) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode);

  useEffect(() => {
    applyThemeMode(document.documentElement, themeMode);
    syncThemeColorMeta(themeMode);
  }, [themeMode]);

  const toggleThemeMode = useCallback(() => {
    setThemeMode((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      const msg = getThemeAnnouncement(next);
      notify({
        title: msg.title,
        description: msg.description,
        variant: 'info',
        tag: 'reflu-theme-mode',
      });
      return next;
    });
  }, [notify]);

  return { themeMode, isDarkMode: themeMode === 'dark', toggleThemeMode };
}
