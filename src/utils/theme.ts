export type ThemeMode = 'light' | 'dark';

export const THEME_ATTR = 'data-theme';

export interface ThemeTarget {
  setAttribute: (name: string, value: string) => void;
  removeAttribute: (name: string) => void;
}

export interface ThemeAnnouncement {
  title: string;
  description: string;
}

/**
 * Resolves initial theme from OS preference (strictly in memory — no browser storage).
 */
export function getInitialThemeMode(): ThemeMode {
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }
  return 'light';
}

export function applyThemeMode(
  target: ThemeTarget | null | undefined,
  mode: ThemeMode
): void {
  if (!target) return;
  if (mode === 'dark') {
    target.setAttribute(THEME_ATTR, 'dark');
  } else {
    target.removeAttribute(THEME_ATTR);
  }
}

export function syncThemeColorMeta(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) {
    meta.content = mode === 'dark' ? '#0B1524' : '#F4F8FC';
  }
}

export function getThemeAnnouncement(mode: ThemeMode): ThemeAnnouncement {
  if (mode === 'dark') {
    return {
      title: 'Karanlık mod açıldı',
      description: 'Gece kullanımı için göz yormayan koyu klinik tema etkinleştirildi.',
    };
  }
  return {
    title: 'Aydınlık mod açıldı',
    description: 'Standart açık mavi ve beyaz klinik temaya dönüldü.',
  };
}
