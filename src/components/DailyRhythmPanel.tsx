import { memo, useCallback, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  Cloud,
  CloudRain,
  CloudSun,
  Compass,
  Flame,
  PenLine,
  Sun,
} from 'lucide-react';
import {
  computeEngagementSnapshot,
  getDailyReflectionPrompt,
  MOOD_OPTIONS,
  type MoodLevel,
  type RhythmDayTone,
} from '../engine/engagementEngine';
import { SYMPTOM_CATALOG, type ActiveTab, type RefluxLogEntry } from '../types/reflux';
import { useToast } from './ToastProvider';

interface DailyRhythmPanelProps {
  logs: RefluxLogEntry[];
  todayStr: string;
  onNavigate: (tab: ActiveTab) => void;
  onStartPromptedLog: (starterText: string) => void;
}

const MOOD_ICONS: Record<MoodLevel, typeof Sun> = {
  great: Sun,
  balanced: CloudSun,
  sensitive: Cloud,
  tough: CloudRain,
};

const MOOD_TONE_STYLES: Record<MoodLevel, { active: string; icon: string }> = {
  great: {
    active: 'border-[#047857] bg-[#ECFDF5] text-[#065F46]',
    icon: 'text-[#047857]',
  },
  balanced: {
    active: 'border-[#1D6FD6] bg-[#EBF4FF] text-[#155CC0]',
    icon: 'text-[#1D6FD6]',
  },
  sensitive: {
    active: 'border-[#B45309] bg-[#FFFBEB] text-[#92400E]',
    icon: 'text-[#B45309]',
  },
  tough: {
    active: 'border-[#B91C1C] bg-[#FEF2F2] text-[#991B1B]',
    icon: 'text-[#B91C1C]',
  },
};

function getBarVisuals(tone: RhythmDayTone, maxSeverity: number) {
  switch (tone) {
    case 'calm':
      return {
        heightPct: 30,
        barClass: 'bg-[#10B981]',
        label: 'Rahat',
        textClass: 'text-[#047857]',
      };
    case 'mild':
      return {
        heightPct: Math.max(40, maxSeverity * 20),
        barClass: 'bg-[#3B82F6]',
        label: `Hafif (${maxSeverity}/5)`,
        textClass: 'text-[#155CC0]',
      };
    case 'moderate':
      return {
        heightPct: 68,
        barClass: 'bg-[#F59E0B]',
        label: `Orta (${maxSeverity}/5)`,
        textClass: 'text-[#B45309]',
      };
    case 'high':
      return {
        heightPct: Math.min(100, Math.max(84, maxSeverity * 20)),
        barClass: 'bg-[#EF4444]',
        label: `Yoğun (${maxSeverity}/5)`,
        textClass: 'text-[#B91C1C]',
      };
    default:
      return {
        heightPct: 12,
        barClass: 'bg-[#DCE7F3]',
        label: 'Kayıt yok',
        textClass: 'text-[#688099]',
      };
  }
}

export const DailyRhythmPanel = memo(function DailyRhythmPanel({
  logs,
  todayStr,
  onNavigate,
  onStartPromptedLog,
}: DailyRhythmPanelProps) {
  const { notify } = useToast();
  const [selectedDayStr, setSelectedDayStr] = useState<string>(todayStr);
  const [selectedMood, setSelectedMood] = useState<MoodLevel | null>(null);

  const currentHour = useMemo(() => new Date().getHours(), []);

  const snapshot = useMemo(
    () => computeEngagementSnapshot(logs, todayStr, currentHour),
    [logs, todayStr, currentHour]
  );

  const dailyPrompt = useMemo(
    () => getDailyReflectionPrompt(todayStr),
    [todayStr]
  );

  const selectedDay = useMemo(
    () =>
      snapshot.last7Days.find((d) => d.dateStr === selectedDayStr) ??
      snapshot.last7Days[snapshot.last7Days.length - 1],
    [snapshot.last7Days, selectedDayStr]
  );

  const activeMoodOption = useMemo(
    () => MOOD_OPTIONS.find((m) => m.id === selectedMood) ?? null,
    [selectedMood]
  );

  const handleSelectMood = useCallback(
    (level: MoodLevel) => {
      setSelectedMood(level);
      const opt = MOOD_OPTIONS.find((m) => m.id === level);
      if (opt) {
        notify({
          title: opt.feedbackTitle,
          description: opt.feedbackBody,
          variant: level === 'great' ? 'success' : 'info',
        });
      }
    },
    [notify]
  );

  // Weekly progress ring math
  const weeklyRatio = snapshot.activeDaysLast7 / 7;
  const ringR = 22;
  const ringCirc = 2 * Math.PI * ringR;
  const ringOffset = ringCirc * (1 - weeklyRatio);

  const unlockedCount = snapshot.milestones.filter((m) => m.unlocked).length;

  return (
    <section
      aria-labelledby="daily-rhythm-heading"
      data-testid="daily-rhythm-panel"
      className="bg-white border border-[#DCE7F3] rounded-2xl overflow-hidden"
    >
      {/* Top Row: Personal Greeting, Weekly Ring & Streak */}
      <div className="p-4 sm:p-6 lg:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5 border-b border-[#E6EFF8]">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-medium text-[#155CC0]">
            Kişisel Gözlem Ritmin · Tıbbi tavsiye değil, kişisel farkındalık günlüğü
          </p>
          <h2
            id="daily-rhythm-heading"
            className="text-xl sm:text-2xl font-semibold tracking-tight text-[#0F233A]"
          >
            {snapshot.timeGreeting} — 7 Günlük Ritim Haritan
          </h2>
          <p className="text-sm text-[#455D75] leading-relaxed">
            {snapshot.nextUnlockHint}
          </p>
        </div>

        {/* Visual Progress Ring + Active Streak */}
        <div className="flex flex-wrap items-center gap-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 54 54" aria-hidden="true">
                <circle
                  cx="27"
                  cy="27"
                  r={ringR}
                  fill="none"
                  stroke="#E2EEF9"
                  strokeWidth="5"
                />
                <circle
                  cx="27"
                  cy="27"
                  r={ringR}
                  fill="none"
                  stroke="#1D6FD6"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={ringCirc}
                  strokeDashoffset={ringOffset}
                  className="transition-[stroke-dashoffset] duration-500 ease-out"
                />
              </svg>
              <span className="absolute font-mono tabular-nums text-xs font-semibold text-[#0F233A]">
                {snapshot.activeDaysLast7}/7
              </span>
            </div>
            <div className="text-xs">
              <p className="font-semibold text-[#0F233A]">Haftalık Aktiflik</p>
              <p className="text-[#688099] tabular-nums mt-0.5">
                {snapshot.calmDaysLast7 > 0
                  ? `${snapshot.calmDaysLast7} rahat gün`
                  : 'Son 7 gün'}
              </p>
            </div>
          </div>

          <div className="h-9 w-px bg-[#E6EFF8] hidden sm:block" aria-hidden="true" />

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#EBF4FF] text-[#155CC0] flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="text-xs">
              <p className="font-mono tabular-nums text-base font-bold text-[#0F233A] leading-tight">
                {snapshot.currentStreakDays} gün
              </p>
              <p className="text-[#688099]">Takip serisi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive 7-Day Visual Rhythm Strip */}
      <div className="p-4 sm:p-6 lg:p-7 space-y-4 sm:space-y-5 border-b border-[#E6EFF8]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-medium text-[#0F233A]">
            <CalendarCheck2 className="w-4 h-4 text-[#1D6FD6]" aria-hidden="true" />
            <span>Son 7 Gün Görsel Özet (detayı görmek için güne tıkla)</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#688099]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-xs bg-[#10B981]" aria-hidden="true" />
              Rahat
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-xs bg-[#3B82F6]" aria-hidden="true" />
              Hafif
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-xs bg-[#F59E0B]" aria-hidden="true" />
              Orta
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-xs bg-[#EF4444]" aria-hidden="true" />
              Yoğun
            </span>
          </div>
        </div>

        <div
          role="group"
          aria-label="Son 7 gün ritim seçici"
          className="grid grid-cols-7 gap-1 sm:gap-3"
        >
          {snapshot.last7Days.map((day) => {
            const visuals = getBarVisuals(day.tone, day.maxSeverity);
            const isSelected = selectedDay?.dateStr === day.dateStr;

            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => setSelectedDayStr(day.dateStr)}
                aria-pressed={isSelected}
                aria-label={`${day.shortWeekday} ${day.dayNum}, ${day.logCount} kayıt, ${visuals.label}`}
                className={`group flex flex-col items-center px-1 py-2 sm:p-3 rounded-xl border transition-colors cursor-pointer min-w-0 touch-manipulation ${
                  isSelected
                    ? 'border-[#1D6FD6] bg-[#F0F7FF]'
                    : 'border-[#E6EFF8] bg-[#FAFBFD] hover:border-[#BBD6F7] hover:bg-[#F7FBFF]'
                }`}
              >
                {/* Mini Vertical Visual Bar */}
                <div className="w-full max-w-[24px] sm:max-w-[28px] h-12 sm:h-14 rounded-lg bg-[#EBF2F9] flex items-end p-0.5 sm:p-1 overflow-hidden">
                  <div
                    className={`w-full rounded-sm transition-all duration-300 ${visuals.barClass}`}
                    style={{ height: `${visuals.heightPct}%` }}
                  />
                </div>

                <span
                  className={`mt-1.5 sm:mt-2 text-[10px] sm:text-xs font-semibold truncate max-w-full ${
                    day.isToday ? 'text-[#155CC0]' : 'text-[#0F233A]'
                  }`}
                >
                  {day.isToday ? 'Bugün' : day.shortWeekday}
                </span>
                <span className="font-mono tabular-nums text-[11px] text-[#688099]">
                  {day.dayNum}
                </span>
                <span className={`mt-1 text-[10px] font-medium truncate max-w-full ${visuals.textClass}`}>
                  {day.logCount > 0 ? `${day.logCount} not` : '—'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Day Inline Visual Preview */}
        {selectedDay && (
          <div
            data-testid="rhythm-selected-day-detail"
            className="p-4 rounded-xl bg-[#F7FBFF] border border-[#DCE7F3] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-[#0F233A]">
                  {selectedDay.isToday
                    ? 'Bugünkü Özet'
                    : `${selectedDay.shortWeekday} (${selectedDay.dateStr})`}
                </span>
                <span aria-hidden="true" className="text-[#8BA0B5]">·</span>
                <span className="font-mono tabular-nums text-[#455D75]">
                  {selectedDay.logCount} kayıt
                </span>
                <span aria-hidden="true" className="text-[#8BA0B5]">·</span>
                <span className={getBarVisuals(selectedDay.tone, selectedDay.maxSeverity).textClass + ' font-medium'}>
                  {getBarVisuals(selectedDay.tone, selectedDay.maxSeverity).label}
                </span>
              </div>

              {selectedDay.entries.length > 0 ? (
                <p className="text-xs text-[#455D75] leading-relaxed">
                  {selectedDay.foodsPreview.length > 0 && (
                    <span className="font-medium text-[#0F233A]">
                      {selectedDay.foodsPreview.join(', ')}
                    </span>
                  )}
                  {selectedDay.foodsPreview.length > 0 ? ' — ' : ''}
                  {selectedDay.entries[0].symptoms.length > 0
                    ? selectedDay.entries[0].symptoms
                        .map(
                          (s) =>
                            `${SYMPTOM_CATALOG[s.code]?.shortLabel} (${s.severity}/5)`
                        )
                        .join(', ')
                    : selectedDay.entries[0].rawText}
                </p>
              ) : (
                <p className="text-xs text-[#688099]">
                  Bu gün için henüz kayıt eklenmemiş. Kısa bir öğün veya his notu ekleyerek ritim çizgini canlı tutabilirsin.
                </p>
              )}
            </div>

            {selectedDay.entries.length > 0 ? (
              <button
                type="button"
                onClick={() => onNavigate('detective')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DCE7F3] bg-white text-xs font-medium text-[#155CC0] hover:bg-[#EBF4FF] whitespace-nowrap shrink-0 self-start sm:self-center cursor-pointer"
              >
                Zaman çizgisinde gör
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('logger')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1D6FD6] text-white text-xs font-medium hover:bg-[#1659B3] whitespace-nowrap shrink-0 self-start sm:self-center cursor-pointer"
              >
                <PenLine className="w-3.5 h-3.5" aria-hidden="true" />
                Kısa Not Ekle
              </button>
            )}
          </div>
        )}
      </div>

      {/* Discovery Milestones Rail (Day 1 -> Day 2 -> Day 7 Motivation) */}
      <div className="px-4 sm:px-6 lg:px-7 py-4 sm:py-5 bg-[#FAFBFD] border-b border-[#E6EFF8] space-y-3">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#0F233A]">
            <Compass className="w-3.5 h-3.5 text-[#1D6FD6]" aria-hidden="true" />
            Keşif Adımların
          </span>
          <span className="font-mono tabular-nums text-[#455D75]">
            {unlockedCount} / {snapshot.milestones.length} adım açıldı
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {snapshot.milestones.map((m) => (
            <div
              key={m.id}
              className={`p-3 rounded-xl border text-xs transition-colors ${
                m.unlocked
                  ? 'bg-white border-[#BBD6F7]'
                  : 'bg-[#F4F8FC] border-[#E6EFF8]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`font-semibold ${
                    m.unlocked ? 'text-[#0F233A]' : 'text-[#455D75]'
                  }`}
                >
                  {m.title}
                </span>
                {m.unlocked ? (
                  <span className="w-5 h-5 rounded-full bg-[#ECFDF5] text-[#047857] flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" aria-hidden="true" />
                  </span>
                ) : (
                  <span className="font-mono tabular-nums text-[11px] text-[#688099]">
                    {m.current}/{m.target}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#688099] mt-1 leading-snug">
                {m.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive 1-Tap Mood Check-In + Rotating Daily Micro-Prompt */}
      <div className="p-4 sm:p-6 lg:p-7 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Left: 1-Tap Comfort Check-In */}
        <div className="lg:col-span-7 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-[#0F233A]">
              Bugün kendini nasıl hissediyorsun?
            </h3>
            <p className="text-xs text-[#688099] mt-0.5">
              Tek dokunuşla günlük hissini işaretle, anında geri bildirim al.
            </p>
          </div>

          <div
            role="group"
            aria-label="Günlük his seçimi"
            className="grid grid-cols-2 sm:grid-cols-4 gap-2"
          >
            {MOOD_OPTIONS.map((opt) => {
              const Icon = MOOD_ICONS[opt.id];
              const isSelected = selectedMood === opt.id;
              const tone = MOOD_TONE_STYLES[opt.id];
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectMood(opt.id)}
                  aria-pressed={isSelected}
                  className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    isSelected
                      ? tone.active
                      : 'border-[#DCE7F3] bg-white text-[#0F233A] hover:bg-[#F7FBFF] hover:border-[#BBD6F7]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${isSelected ? '' : tone.icon}`}
                    aria-hidden="true"
                  />
                  <span className="text-xs font-semibold whitespace-nowrap">
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>

          {activeMoodOption && (
            <div
              data-testid="mood-feedback-banner"
              className="p-3.5 rounded-xl bg-[#F7FBFF] border border-[#DCE7F3] text-xs space-y-1"
            >
              <p className="font-semibold text-[#0F233A]">
                {activeMoodOption.feedbackTitle}
              </p>
              <p className="text-[#455D75] leading-relaxed">
                {activeMoodOption.feedbackBody}
              </p>
            </div>
          )}
        </div>

        {/* Right: Rotating Daily Reflection Prompt (Day 2 Engagement) */}
        <div className="lg:col-span-5 p-4 sm:p-5 rounded-xl bg-[#F7FBFF] border border-[#DCE7F3] space-y-3">
          <p className="text-xs font-semibold text-[#155CC0]">
            {dailyPrompt.contextLabel}
          </p>
          <p className="text-sm font-medium text-[#0F233A] leading-snug">
            {dailyPrompt.question}
          </p>
          <button
            type="button"
            onClick={() => onStartPromptedLog(dailyPrompt.starterText)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1D6FD6] text-white text-xs font-medium hover:bg-[#1659B3] transition-colors whitespace-nowrap cursor-pointer"
          >
            <PenLine className="w-3.5 h-3.5" aria-hidden="true" />
            Tek Tıkla Not Al
          </button>
        </div>
      </div>
    </section>
  );
});
