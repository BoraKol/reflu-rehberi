import type { AppPersistedState } from '../types/reflux';

const LEGACY_STORAGE_KEY = 'reflurehber_state_v1';

export const DEFAULT_STATE: AppPersistedState = {
  logs: [],
  assessments: [],
  sleepShield: {
    lastMealTimestamp: null,
    windowHours: 3,
  },
  isDemoLoaded: false,
};

/**
 * Explicitly purges any legacy browser-side health data on boot.
 * ReflüRehber NEVER stores user health data in localStorage or sessionStorage.
 */
export function purgeLegacyBrowserStorage(): void {
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    window.sessionStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Ignore restricted storage contexts gracefully
  }
}

export interface RefluRehberExportPayload {
  app: 'ReflüRehber';
  formatVersion: '1.0';
  exportedAt: string;
  privacyNotice: string;
  disclaimer: string;
  summary: {
    logCount: number;
    assessmentCount: number;
  };
  data: AppPersistedState;
}

export function buildExportPayload(
  state: AppPersistedState,
  now: Date = new Date()
): RefluRehberExportPayload {
  return {
    app: 'ReflüRehber',
    formatVersion: '1.0',
    exportedAt: now.toISOString(),
    privacyNotice:
      'Bu dosya, ReflüRehber veri gizliliği politikası ile uyumlu olarak kullanıcının bilgisayarına indirilen şifrelenmemiş (düz metin) JSON yedeğidir; veriler uygulama içinde veya tarayıcıda saklanmaz.',
    disclaimer:
      'Hasta tarafından kaydedilen öznel takip verileri. Tıbbi teşhis niteliği taşımaz.',
    summary: {
      logCount: state.logs.length,
      assessmentCount: state.assessments.length,
    },
    data: state,
  };
}

export function exportStateAsJson(state: AppPersistedState): string {
  const now = new Date();
  const payload = buildExportPayload(state, now);
  const filename = `reflurehber-yedek-${now.toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revocation slightly so iOS Safari / mobile WebViews complete the download
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}
