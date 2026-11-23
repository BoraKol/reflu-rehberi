import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';
import { createId } from '../lib/id';
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  sendBrowserNotification,
  type BrowserNotificationStatus,
} from '../utils/browserNotifications';

export type ToastVariant = 'info' | 'reminder' | 'success' | 'warning' | 'error';

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
  /** When true, mirrors this important alert/reminder to a native Browser Notification if permission is granted. */
  browserAlert?: boolean;
  /** Optional deduplication tag for native Browser Notifications. */
  tag?: string;
}

interface ToastItem
  extends Required<Pick<ToastInput, 'title' | 'variant' | 'durationMs'>> {
  id: string;
  description?: string;
  mirroredToBrowser?: boolean;
}

interface ToastContextValue {
  notify: (toast: ToastInput) => void;
  dismiss: (id: string) => void;
  browserNotificationStatus: BrowserNotificationStatus;
  requestBrowserNotificationPermission: () => Promise<BrowserNotificationStatus>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_VISIBLE_TOASTS = 4;

const VARIANT_STYLES: Record<
  ToastVariant,
  {
    surface: string;
    border: string;
    iconBg: string;
    iconColor: string;
    kicker?: string;
    kickerColor?: string;
    Icon: typeof Info;
  }
> = {
  info: {
    surface: 'bg-white',
    border: 'border-[#CBE0FA]',
    iconBg: 'bg-[#EBF4FF]',
    iconColor: 'text-[#1D6FD6]',
    Icon: Info,
  },
  reminder: {
    surface: 'bg-[#F7FBFF]',
    border: 'border-[#93C5FD]',
    iconBg: 'bg-[#1D6FD6]',
    iconColor: 'text-white',
    kicker: 'Hatırlatıcı',
    kickerColor: 'text-[#155CC0]',
    Icon: BellRing,
  },
  success: {
    surface: 'bg-white',
    border: 'border-[#B7EBD6]',
    iconBg: 'bg-[#ECFDF5]',
    iconColor: 'text-[#047857]',
    Icon: CheckCircle2,
  },
  warning: {
    surface: 'bg-white',
    border: 'border-[#FDE2A7]',
    iconBg: 'bg-[#FFFBEB]',
    iconColor: 'text-[#B45309]',
    Icon: AlertTriangle,
  },
  error: {
    surface: 'bg-white',
    border: 'border-[#FECACA]',
    iconBg: 'bg-[#FEF2F2]',
    iconColor: 'text-[#B91C1C]',
    Icon: AlertCircle,
  },
};

const ToastCard = memo(function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const pausedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const remainingRef = useRef(item.durationMs);
  const startedAtRef = useRef(Date.now());

  const triggerExit = useCallback(() => {
    if (exitTimerRef.current !== null) return;
    setVisible(false);
    exitTimerRef.current = window.setTimeout(() => {
      onDismiss(item.id);
    }, 180);
  }, [item.id, onDismiss]);

  const startTimer = useCallback(() => {
    startedAtRef.current = Date.now();
    timerRef.current = window.setTimeout(() => {
      triggerExit();
    }, remainingRef.current);
  }, [triggerExit]);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setVisible(true));
    startTimer();
    return () => {
      window.cancelAnimationFrame(raf);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
  }, [startTimer]);

  const handleMouseEnter = () => {
    if (pausedRef.current) return;
    pausedRef.current = true;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const elapsed = Date.now() - startedAtRef.current;
    remainingRef.current = Math.max(800, remainingRef.current - elapsed);
  };

  const handleMouseLeave = () => {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    startTimer();
  };

  const style = VARIANT_STYLES[item.variant];
  const Icon = style.Icon;

  return (
    <div
      role={item.variant === 'error' ? 'alert' : 'status'}
      aria-live={item.variant === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-testid="app-toast"
      data-toast-variant={item.variant}
      className={`pointer-events-auto w-full sm:w-[372px] rounded-xl ${style.surface} border ${style.border} shadow-[0_12px_32px_-8px_rgba(15,35,58,0.16)] p-3.5 flex items-start gap-3 transition-all duration-200 ease-out ${
        visible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-2 scale-[0.98]'
      }`}
    >
      <div
        className={`w-8 h-8 rounded-lg ${style.iconBg} ${style.iconColor} flex items-center justify-center shrink-0 mt-0.5`}
      >
        <Icon className="w-4 h-4" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1 space-y-0.5">
        {(style.kicker || item.mirroredToBrowser) && (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold">
            {style.kicker && (
              <span className={style.kickerColor}>{style.kicker}</span>
            )}
            {style.kicker && item.mirroredToBrowser && (
              <span aria-hidden="true" className="text-[#8BA0B5]">
                ·
              </span>
            )}
            {item.mirroredToBrowser && (
              <span className="font-medium text-[#455D75]">
                Tarayıcı bildirimi iletildi
              </span>
            )}
          </div>
        )}
        <p className="text-sm font-semibold text-[#0F233A] leading-snug">
          {item.title}
        </p>
        {item.description && (
          <p className="text-xs text-[#455D75] leading-relaxed">
            {item.description}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={triggerExit}
        aria-label="Bildirimi kapat"
        className="p-1 rounded-md text-[#8BA0B5] hover:text-[#0F233A] hover:bg-[#EBF4FF] transition-colors shrink-0 cursor-pointer"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [browserNotificationStatus, setBrowserNotificationStatus] =
    useState<BrowserNotificationStatus>(() => getNotificationPermissionStatus());

  // Sync permission state if the user changes browser site settings and returns to the tab
  useEffect(() => {
    const syncStatus = () => {
      setBrowserNotificationStatus(getNotificationPermissionStatus());
    };
    window.addEventListener('focus', syncStatus);
    document.addEventListener('visibilitychange', syncStatus);
    return () => {
      window.removeEventListener('focus', syncStatus);
      document.removeEventListener('visibilitychange', syncStatus);
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback((input: ToastInput) => {
    const variant: ToastVariant = input.variant ?? 'info';
    const durationMs =
      input.durationMs ??
      (variant === 'error' || variant === 'warning' || variant === 'reminder'
        ? 6000
        : 4000);
    const id = createId('toast');

    let mirroredToBrowser = false;
    if (input.browserAlert) {
      mirroredToBrowser = sendBrowserNotification({
        title: input.title,
        body: input.description,
        tag: input.tag,
      });
    }

    setToasts((prev) => {
      const next: ToastItem = {
        id,
        title: input.title,
        description: input.description,
        variant,
        durationMs,
        mirroredToBrowser,
      };
      return [...prev, next].slice(-MAX_VISIBLE_TOASTS);
    });
  }, []);

  const requestBrowserNotificationPermission = useCallback(async () => {
    const nextStatus = await requestNotificationPermission();
    setBrowserNotificationStatus(nextStatus);

    if (nextStatus === 'granted') {
      notify({
        title: 'Tarayıcı bildirimleri açıldı',
        description:
          'Yatış saatiniz yaklaştığında ve önemli uyarılarda hem tarayıcı hem uygulama içi bildirim alacaksınız.',
        variant: 'success',
        browserAlert: true,
        tag: 'reflu-permission-granted',
      });
    } else if (nextStatus === 'denied') {
      notify({
        title: 'Tarayıcı bildirim izni reddedildi',
        description:
          'Önemli uyarılar ve yatış saati hatırlatıcıları uygulama içi bildirim (toast) olarak gösterilmeye devam edecek.',
        variant: 'warning',
      });
    } else if (nextStatus === 'unsupported') {
      notify({
        title: 'Tarayıcı bildirimleri desteklenmiyor',
        description:
          'Hatırlatıcılar uygulama içi bildirim (toast) olarak sunulmaya devam eder.',
        variant: 'info',
      });
    }

    return nextStatus;
  }, [notify]);

  const contextValue = useMemo<ToastContextValue>(
    () => ({
      notify,
      dismiss,
      browserNotificationStatus,
      requestBrowserNotificationPermission,
    }),
    [notify, dismiss, browserNotificationStatus, requestBrowserNotificationPermission]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Floating Toast Viewport (respects mobile bottom nav height & safe area) */}
      <div
        aria-label="Uygulama bildirimleri"
        className="no-print pointer-events-none fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-5 inset-x-3 sm:inset-x-auto sm:right-5 z-[60] flex flex-col items-stretch sm:items-end gap-2.5"
      >
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return ctx;
}
