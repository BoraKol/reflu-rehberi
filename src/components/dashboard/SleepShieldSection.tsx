import { memo, useCallback, useEffect, useState } from 'react';
import {
  Bell,
  BellOff,
  BellRing,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { formatClockHHMM, isValidHHMM } from '../../lib/time';
import type { SleepShieldState } from '../../types/reflux';
import { createSampleBedtimeReminder } from '../../utils/browserNotifications';
import { useToast } from '../ToastProvider';

const RING_RADIUS = 64;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Isolated leaf timer: ONLY this small ring re-renders each second while the
 * timer is active and the tab is visible. Pauses automatically when hidden.
 */
const CountdownPanel = memo(function CountdownPanel({
  lastMealTimestamp,
  windowHours,
}: SleepShieldState) {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!lastMealTimestamp) return;
    setNowMs(Date.now());
    const tick = () => {
      if (!document.hidden) setNowMs(Date.now());
    };
    const interval = window.setInterval(tick, 1000);
    const onVis = () => {
      if (!document.hidden) setNowMs(Date.now());
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [lastMealTimestamp]);

  const totalWindowMs = windowHours * 3600 * 1000;
  const safeBedtimeMs = lastMealTimestamp ? lastMealTimestamp + totalWindowMs : null;
  const remainingMs = safeBedtimeMs ? Math.max(0, safeBedtimeMs - nowMs) : 0;
  const elapsedMs = lastMealTimestamp ? Math.max(0, nowMs - lastMealTimestamp) : 0;
  const progressRatio = lastMealTimestamp ? Math.min(1, elapsedMs / totalWindowMs) : 0;
  const isSafeNow = Boolean(lastMealTimestamp && remainingMs === 0);
  const dashOffset = RING_CIRCUMFERENCE * (1 - progressRatio);

  return (
    <div className="lg:col-span-4 bg-[#F7FBFF] border-t lg:border-t-0 lg:border-l border-[#E2EEF9] p-5 sm:p-8 flex flex-col items-center justify-center">
      <div className="relative w-40 h-40 flex items-center justify-center">
        <svg className="w-40 h-40 -rotate-90" viewBox="0 0 148 148" aria-hidden="true">
          <circle
            cx="74"
            cy="74"
            r={RING_RADIUS}
            fill="none"
            stroke="#DCE7F3"
            strokeWidth="8"
          />
          <circle
            cx="74"
            cy="74"
            r={RING_RADIUS}
            fill="none"
            stroke={isSafeNow ? '#047857' : '#1D6FD6'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={lastMealTimestamp ? dashOffset : RING_CIRCUMFERENCE}
            className="transition-[stroke-dashoffset] duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
          {!lastMealTimestamp ? (
            <>
              <span className="text-xs text-[#455D75]">Beklemede</span>
              <span className="font-mono tabular-nums text-xl font-semibold text-[#0F233A] mt-0.5">
                {windowHours}:00:00
              </span>
              <span className="text-[11px] text-[#688099] mt-0.5">Başlatılmadı</span>
            </>
          ) : isSafeNow ? (
            <>
              <CheckCircle2 className="w-6 h-6 text-[#047857] mb-1" aria-hidden="true" />
              <span className="text-xs font-semibold text-[#047857]">
                Hedef Aralık Doldu
              </span>
              <span className="text-[11px] text-[#455D75] mt-0.5">Süre tamamlandı</span>
            </>
          ) : (
            <>
              <span className="text-[11px] text-[#455D75]">Kalan süre</span>
              <span
                data-testid="shield-countdown"
                className="font-mono tabular-nums text-xl font-semibold text-[#0F233A] mt-0.5"
              >
                {formatCountdown(remainingMs)}
              </span>
              <span className="text-[11px] text-[#155CC0] font-medium mt-0.5">
                Sayaç aktif
              </span>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 text-center">
        {safeBedtimeMs ? (
          <p
            data-testid="safe-bedtime-display"
            className="text-sm font-medium text-[#0F233A] tabular-nums"
          >
            Hedeflenen saat:{' '}
            <span className="font-mono font-semibold text-[#155CC0]">
              {formatClockHHMM(safeBedtimeMs)}
            </span>
          </p>
        ) : (
          <p className="text-xs text-[#688099] max-w-[200px]">
            Yemeği bitirdiğinde hedeflediğin yatış saati burada hesaplanır
          </p>
        )}
        {lastMealTimestamp && (
          <p className="text-xs text-[#688099] mt-1 tabular-nums">
            Son öğün: {formatClockHHMM(lastMealTimestamp)}
          </p>
        )}
      </div>
    </div>
  );
});

interface SleepShieldSectionProps {
  sleepShield: SleepShieldState;
  onUpdateSleepShield: (next: SleepShieldState) => void;
}

export const SleepShieldSection = memo(function SleepShieldSection({
  sleepShield,
  onUpdateSleepShield,
}: SleepShieldSectionProps) {
  const {
    notify,
    browserNotificationStatus,
    requestBrowserNotificationPermission,
  } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [customTimeInput, setCustomTimeInput] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [requestingNotif, setRequestingNotif] = useState(false);

  const safeBedtimeMs = sleepShield.lastMealTimestamp
    ? sleepShield.lastMealTimestamp + sleepShield.windowHours * 3600 * 1000
    : null;

  const handleRequestNotifications = useCallback(async () => {
    setRequestingNotif(true);
    try {
      await requestBrowserNotificationPermission();
    } finally {
      setRequestingNotif(false);
    }
  }, [requestBrowserNotificationPermission]);

  const handlePreviewBedtimeReminder = useCallback(() => {
    const sample = createSampleBedtimeReminder(safeBedtimeMs);
    notify({
      title: sample.title,
      description: sample.description,
      variant: sample.variant,
      browserAlert: true,
      tag: sample.tag,
    });
  }, [safeBedtimeMs, notify]);

  const handleMarkMealFinished = useCallback(
    (minutesAgo = 0) => {
      const ts = Date.now() - minutesAgo * 60 * 1000;
      const targetMs = ts + sleepShield.windowHours * 3600 * 1000;
      onUpdateSleepShield({ ...sleepShield, lastMealTimestamp: ts });
      setShowTimePicker(false);
      notify({
        title: 'Yemek–Uyku Kalkanı başlatıldı',
        description: `Güvenli yatış saati: ${formatClockHHMM(targetMs)}`,
        variant: 'success',
      });
    },
    [sleepShield, onUpdateSleepShield, notify]
  );

  const handleCustomTimeApply = useCallback(() => {
    if (!isValidHHMM(customTimeInput)) return;
    const [hh, mm] = customTimeInput.split(':').map(Number);
    const d = new Date();
    d.setHours(hh, mm, 0, 0);
    if (d.getTime() > Date.now() + 60_000) {
      d.setDate(d.getDate() - 1);
    }
    const targetMs = d.getTime() + sleepShield.windowHours * 3600 * 1000;
    onUpdateSleepShield({ ...sleepShield, lastMealTimestamp: d.getTime() });
    setShowTimePicker(false);
    notify({
      title: 'Öğün saati güncellendi',
      description: `Güvenli yatış saati: ${formatClockHHMM(targetMs)}`,
      variant: 'success',
    });
  }, [customTimeInput, sleepShield, onUpdateSleepShield, notify]);

  const handleChangeWindowHours = useCallback(
    (hours: 3 | 4) => {
      if (sleepShield.windowHours === hours) return;
      onUpdateSleepShield({ ...sleepShield, windowHours: hours });
      notify({
        title: `Kalkan süresi ${hours} saat olarak ayarlandı`,
        variant: 'info',
      });
    },
    [sleepShield, onUpdateSleepShield, notify]
  );

  const handleResetShield = useCallback(() => {
    onUpdateSleepShield({ ...sleepShield, lastMealTimestamp: null });
    notify({ title: 'Zamanlayıcı sıfırlandı', variant: 'info' });
  }, [onUpdateSleepShield, sleepShield, notify]);

  return (
    <section
      aria-labelledby="sleep-shield-heading"
      className="bg-white border border-[#DCE7F3] rounded-2xl overflow-hidden"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-8 p-4 sm:p-6 lg:p-8 space-y-5">
          <div className="space-y-1.5">
            <p className="text-xs text-[#155CC0] font-medium">
              Akşam Rutin Zamanlayıcısı
            </p>
            <h2
              id="sleep-shield-heading"
              className="text-lg sm:text-2xl font-semibold tracking-tight text-[#0F233A]"
            >
              {sleepShield.windowHours} Saat Yemek–Uyku Zamanlayıcısı
            </h2>
            <p className="text-sm text-[#455D75] max-w-xl leading-relaxed">
              Son öğün saatini işaretleyip seçtiğin aralığı takip ederek akşam alışkanlıklarının ertesi güne nasıl yansıdığını kendi gözlemlerinle karşılaştırabilirsin.
            </p>
          </div>

          <div
            role="group"
            aria-label="Yemek uyku aralığı seçimi"
            className="grid grid-cols-1 sm:inline-flex items-center gap-1 p-1 bg-[#F0F6FC] border border-[#E2EEF9] rounded-lg w-full sm:w-auto"
          >
            <button
              type="button"
              onClick={() => handleChangeWindowHours(3)}
              aria-pressed={sleepShield.windowHours === 3}
              className={`min-h-9 px-3.5 py-2 rounded-md text-xs font-medium transition-colors text-center whitespace-nowrap cursor-pointer ${
                sleepShield.windowHours === 3
                  ? 'bg-white text-[#155CC0] shadow-xs'
                  : 'text-[#455D75] hover:text-[#0F233A]'
              }`}
            >
              3 Saat (Klasik Reflü)
            </button>
            <button
              type="button"
              onClick={() => handleChangeWindowHours(4)}
              aria-pressed={sleepShield.windowHours === 4}
              className={`min-h-9 px-3.5 py-2 rounded-md text-xs font-medium transition-colors text-center whitespace-nowrap cursor-pointer ${
                sleepShield.windowHours === 4
                  ? 'bg-white text-[#155CC0] shadow-xs'
                  : 'text-[#455D75] hover:text-[#0F233A]'
              }`}
            >
              4 Saat (Sessiz Reflü)
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => handleMarkMealFinished(0)}
              className="inline-flex items-center justify-center gap-2 min-h-10 px-4 sm:px-5 py-2.5 rounded-lg bg-[#1D6FD6] text-white text-sm font-medium hover:bg-[#1659B3] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D6FD6] whitespace-nowrap cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              Yemeği Bitirdim
            </button>
            <button
              type="button"
              onClick={() => handleMarkMealFinished(15)}
              className="min-h-10 px-3.5 py-2 rounded-lg border border-[#DCE7F3] bg-white text-xs font-medium text-[#0F233A] hover:bg-[#F4F8FC] transition-colors whitespace-nowrap cursor-pointer"
            >
              15 dk önce
            </button>
            <button
              type="button"
              onClick={() => handleMarkMealFinished(30)}
              className="min-h-10 px-3.5 py-2 rounded-lg border border-[#DCE7F3] bg-white text-xs font-medium text-[#0F233A] hover:bg-[#F4F8FC] transition-colors whitespace-nowrap cursor-pointer"
            >
              30 dk önce
            </button>
            <button
              type="button"
              onClick={() => setShowTimePicker((v) => !v)}
              className="inline-flex items-center gap-1.5 min-h-10 px-3.5 py-2 rounded-lg border border-[#DCE7F3] bg-white text-xs font-medium text-[#0F233A] hover:bg-[#F4F8FC] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-[#1D6FD6]" aria-hidden="true" />
              Saat seç
            </button>
            {sleepShield.lastMealTimestamp && (
              <button
                type="button"
                onClick={handleResetShield}
                aria-label="Yemek zamanlayıcısını sıfırla"
                className="inline-flex items-center gap-1 min-h-10 px-3 py-2 rounded-lg text-xs font-medium text-[#455D75] hover:text-[#0F233A] hover:bg-[#F0F6FC] transition-colors whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Sıfırla
              </button>
            )}
          </div>

          {showTimePicker && (
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <label htmlFor="custom-meal-time" className="text-xs font-medium text-[#455D75]">
                Son öğün bitiş saati:
              </label>
              <input
                id="custom-meal-time"
                type="time"
                value={customTimeInput}
                onChange={(e) => setCustomTimeInput(e.target.value)}
                className="min-h-10 px-3 py-1.5 rounded-lg border border-[#C6D9ED] text-base sm:text-sm font-mono tabular-nums text-[#0F233A] bg-white focus:outline-none focus:border-[#1D6FD6]"
              />
              <button
                type="button"
                onClick={handleCustomTimeApply}
                disabled={!customTimeInput}
                className="min-h-10 px-4 py-1.5 rounded-lg bg-[#0F233A] text-white text-xs font-medium disabled:opacity-40 cursor-pointer"
              >
                Uygula
              </button>
            </div>
          )}
        </div>

        <CountdownPanel
          lastMealTimestamp={sleepShield.lastMealTimestamp}
          windowHours={sleepShield.windowHours}
        />
      </div>

      {/* Browser Notification & Reminder Permission Strip */}
      <div className="px-4 sm:px-6 lg:px-8 py-3.5 bg-[#F7FBFF] border-t border-[#E6EFF8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
              browserNotificationStatus === 'granted'
                ? 'bg-[#EBF4FF] text-[#155CC0]'
                : browserNotificationStatus === 'denied'
                  ? 'bg-[#FFFBEB] text-[#B45309]'
                  : 'bg-white border border-[#DCE7F3] text-[#1D6FD6]'
            }`}
          >
            {browserNotificationStatus === 'granted' ? (
              <BellRing className="w-3.5 h-3.5" aria-hidden="true" />
            ) : browserNotificationStatus === 'denied' ? (
              <BellOff className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Bell className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0 text-xs leading-relaxed">
            {browserNotificationStatus === 'granted' ? (
              <p className="text-[#0F233A]">
                <span className="font-semibold text-[#155CC0]">Tarayıcı bildirimleri açık</span>
                <span aria-hidden="true" className="mx-1.5 text-[#8BA0B5]">·</span>
                <span className="text-[#455D75]">
                  &ldquo;Yatış saatin yaklaşıyor&rdquo; (30 ve 15 dk kala) ve güvenli saat hatırlatıcıları hem tarayıcı hem uygulama içi bildirimle iletilir.
                </span>
              </p>
            ) : browserNotificationStatus === 'denied' ? (
              <p className="text-[#0F233A]">
                <span className="font-semibold text-[#B45309]">Tarayıcı bildirimleri engellendi</span>
                <span aria-hidden="true" className="mx-1.5 text-[#8BA0B5]">·</span>
                <span className="text-[#455D75]">
                  Yatış saati hatırlatıcıları uygulama içi bildirim (toast) olarak gösterilmeye devam eder.
                </span>
              </p>
            ) : browserNotificationStatus === 'unsupported' ? (
              <p className="text-[#455D75]">
                Bu tarayıcı masaüstü bildirimlerini desteklemiyor; hatırlatıcılar uygulama içi bildirim olarak sunulur.
              </p>
            ) : (
              <p className="text-[#0F233A]">
                <span className="font-semibold">Yatış saati hatırlatıcıları</span>
                <span aria-hidden="true" className="mx-1.5 text-[#8BA0B5]">·</span>
                <span className="text-[#455D75]">
                  &ldquo;Yatış saatin yaklaşıyor&rdquo; ve önemli uyarılar için tarayıcı bildirim izni verebilirsiniz.
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {browserNotificationStatus === 'default' && (
            <button
              type="button"
              onClick={handleRequestNotifications}
              disabled={requestingNotif}
              className="inline-flex items-center gap-1.5 min-h-9 px-3 py-1.5 rounded-lg border border-[#BBD6F7] bg-[#EBF4FF] text-[#155CC0] text-xs font-medium hover:bg-[#DCEBFE] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" aria-hidden="true" />
              {requestingNotif ? 'İzin isteniyor…' : 'Bildirim İzni Ver'}
            </button>
          )}
          <button
            type="button"
            onClick={handlePreviewBedtimeReminder}
            className="inline-flex items-center gap-1.5 min-h-9 px-3 py-1.5 rounded-lg border border-[#DCE7F3] bg-white text-[#0F233A] text-xs font-medium hover:bg-[#F4F8FC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BellRing className="w-3.5 h-3.5 text-[#1D6FD6]" aria-hidden="true" />
            Örnek Hatırlatıcı
          </button>
        </div>
      </div>

      {/* Expandable Personal Routine Guide Drawer */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 bg-white border-t border-[#E6EFF8]">
        <button
          type="button"
          onClick={() => setDrawerOpen((o) => !o)}
          aria-expanded={drawerOpen}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#155CC0] hover:text-[#1D6FD6] transition-colors cursor-pointer text-left"
        >
          <span>Bu zamanlayıcıyı günlüğünde nasıl kullanabilirsin?</span>
          {drawerOpen ? (
            <ChevronUp className="w-4 h-4 shrink-0" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4 shrink-0" aria-hidden="true" />
          )}
        </button>

        {drawerOpen && (
          <div className="mt-4 pt-4 border-t border-[#EEF4FA] grid sm:grid-cols-2 gap-5 sm:gap-6 text-sm text-[#455D75] leading-relaxed">
            <div>
              <h3 className="font-semibold text-[#0F233A] mb-1">
                1. Kendi Akşam Saatini Gözlemle
              </h3>
              <p>
                3 saat veya 4 saat seçeneğini tamamen kendi akşam alışkanlığını takip etmek için kullanabilirsin. Birkaç gün düzenli not aldığında hangi saatlerin sana daha rahat geldiğini zaman çizginde netçe görebilirsin.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[#0F233A] mb-1">
                2. Tıbbi Tavsiye Değil, Kişisel Not
              </h3>
              <p>
                Bu zamanlayıcı bir tedavi veya tıbbi yönlendirme sunmaz; yalnızca akşam öğünü ile uyku saatlerin arasındaki farkı hatırlamanı kolaylaştıran sade bir takip aracıdır.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
});
