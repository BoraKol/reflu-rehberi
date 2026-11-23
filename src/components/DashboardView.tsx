import { memo, useMemo } from 'react';
import { LogIn, Plus } from 'lucide-react';
import { computeSleepGapComparison } from '../engine/correlationEngine';
import { getTodayLocalDateStr } from '../lib/time';
import {
  SYMPTOM_CATALOG,
  type ActiveTab,
  type AssessmentRecord,
  type RefluxLogEntry,
  type SleepShieldState,
} from '../types/reflux';
import type { AuthModalMode } from './AuthModal';
import { DailyRhythmPanel } from './DailyRhythmPanel';
import { ConsensusBadge, RedFlagAlertBanner } from './SemanticBadges';
import { WeeklyGerdLprMiniChart } from './WeeklyGerdLprMiniChart';
import { SleepShieldSection } from './dashboard/SleepShieldSection';
import { PageHeader } from './ui/PageHeader';
import { buttonClass } from './ui/styles';

interface DashboardViewProps {
  logs: RefluxLogEntry[];
  assessments: AssessmentRecord[];
  sleepShield: SleepShieldState;
  onUpdateSleepShield: (next: SleepShieldState) => void;
  onNavigate: (tab: ActiveTab) => void;
  onStartPromptedLog: (starterText: string) => void;
  onLoadDemo: () => void;
  isDemoLoaded: boolean;
  isSignedIn: boolean;
  onOpenAuth: (mode?: AuthModalMode) => void;
}

const PROFILE_LABEL_MAP: Record<AssessmentRecord['profileType'], string> = {
  LPR_DOMINANT: 'Sessiz Reflü (LPR) Ağırlıklı',
  GERD_DOMINANT: 'Klasik Reflü (GERD) Ağırlıklı',
  MIXED: 'Karma (GERD + LPR) Profil',
  LOW_SYMPTOM: 'Düşük Belirti Düzeyi',
};

const RecentLogsCard = memo(function RecentLogsCard({
  recentLogs,
  isDemoLoaded,
  isSignedIn,
  onNavigate,
  onOpenAuth,
  onLoadDemo,
}: {
  recentLogs: RefluxLogEntry[];
  isDemoLoaded: boolean;
  isSignedIn: boolean;
  onNavigate: (tab: ActiveTab) => void;
  onOpenAuth: (mode?: AuthModalMode) => void;
  onLoadDemo: () => void;
}) {
  return (
    <section
      aria-labelledby="recent-logs-heading"
      className="bg-white border border-[#DCE7F3] rounded-2xl p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E6EFF8]">
        <div>
          <h2 id="recent-logs-heading" className="text-base font-semibold text-[#0F233A]">
            Son Kayıtlar
          </h2>
          <p className="text-xs text-[#688099] mt-0.5">
            {isDemoLoaded
              ? 'Geçici 14 günlük örnek kayıtlar'
              : 'Son öğün ve belirti kayıtların'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('logger')}
          className="text-xs font-medium text-[#155CC0] hover:underline whitespace-nowrap cursor-pointer"
        >
          Tümünü yönet / Yeni ekle
        </button>
      </div>

      {recentLogs.length === 0 ? (
        <div className="py-8 sm:py-10 text-center max-w-md mx-auto space-y-4">
          <p className="text-sm font-medium text-[#0F233A]">
            {isSignedIn
              ? 'Henüz kişisel öğün veya belirti kaydınız yok.'
              : 'Kişisel günlüğünüzü başlatmak için giriş yapın veya örnek veriyi önizleyin.'}
          </p>
          <p className="text-xs text-[#455D75] leading-relaxed">
            Kayıtlarınız tarayıcıda tutulmaz; yalnızca kendi hesabınızda güvenle saklanır. Dilerseniz 14 günlük örnek veriyi geçici olarak inceleyebilirsiniz.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            {isSignedIn ? (
              <button
                type="button"
                onClick={() => onNavigate('logger')}
                className={buttonClass('primary', 'sm')}
              >
                İlk Kaydı Ekle
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className={buttonClass('primary', 'sm')}
              >
                <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                Giriş Yap / Kaydol
              </button>
            )}
            {!isDemoLoaded && (
              <button
                type="button"
                onClick={onLoadDemo}
                className={buttonClass('outline', 'sm')}
              >
                14 Günlük Örnek Önizle
              </button>
            )}
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-[#E6EFF8]">
          {recentLogs.map((entry) => (
            <li key={entry.id} className="py-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#455D75]">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono tabular-nums">
                  <span className="font-medium text-[#0F233A]">{entry.dateStr}</span>
                  <span aria-hidden="true">·</span>
                  <span>{entry.timeHHMM}</span>
                  {typeof entry.mealToSleepMinutes === 'number' && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>
                        Yemek–Uyku: {Math.floor(entry.mealToSleepMinutes / 60)} sa{' '}
                        {entry.mealToSleepMinutes % 60} dk
                      </span>
                    </>
                  )}
                </div>
                <span className="text-[#688099]">
                  {entry.symptoms.length === 0
                    ? 'Belirti bildirilmedi'
                    : entry.symptoms
                        .map(
                          (s) =>
                            `${SYMPTOM_CATALOG[s.code]?.shortLabel} (${s.severity}/5)`
                        )
                        .join(' · ')}
                </span>
              </div>

              {entry.redFlag?.hasRedFlag && (
                <RedFlagAlertBanner result={entry.redFlag} compact />
              )}

              <p className="text-sm text-[#0F233A] leading-relaxed break-words">
                {entry.rawText}
              </p>

              {entry.foods.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {entry.foods.map((food, idx) => (
                    <div
                      key={`${entry.id}-f-${idx}`}
                      className="inline-flex flex-wrap items-center gap-1.5 text-xs text-[#0F233A]"
                    >
                      <span className="font-medium">
                        {food.matchedFoodName ?? food.rawName}
                      </span>
                      <ConsensusBadge
                        status={food.status}
                        consensusLevel={food.consensusLevel}
                      />
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
});

export const DashboardView = memo(function DashboardView({
  logs,
  assessments,
  sleepShield,
  onUpdateSleepShield,
  onNavigate,
  onStartPromptedLog,
  onLoadDemo,
  isDemoLoaded,
  isSignedIn,
  onOpenAuth,
}: DashboardViewProps) {
  const todayStr = useMemo(() => getTodayLocalDateStr(), []);
  const todayLogsCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < logs.length; i++) {
      if (logs[i].dateStr === todayStr) count += 1;
    }
    return count;
  }, [logs, todayStr]);

  const recentLogs = useMemo(() => logs.slice(0, 5), [logs]);
  const latestAssessment = assessments[0] ?? null;
  const sleepStats = useMemo(() => computeSleepGapComparison(logs), [logs]);

  return (
    <div className="space-y-6 sm:space-y-7">
      <PageHeader
        kicker="Günlük Takip Özeti"
        title="Bugün"
        actions={
          <button
            type="button"
            onClick={() => onNavigate('logger')}
            className={buttonClass('primary', 'lg', 'w-full sm:w-auto')}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Hızlı Kayıt Ekle
          </button>
        }
      />

      <DailyRhythmPanel
        logs={logs}
        todayStr={todayStr}
        onNavigate={onNavigate}
        onStartPromptedLog={onStartPromptedLog}
      />

      <WeeklyGerdLprMiniChart logs={logs} todayStr={todayStr} onNavigate={onNavigate} />

      <SleepShieldSection
        sleepShield={sleepShield}
        onUpdateSleepShield={onUpdateSleepShield}
      />

      {/* Unified Horizontal Summary Strip */}
      <section
        aria-label="Kişisel özet göstergeleri"
        className="bg-white border border-[#DCE7F3] rounded-2xl grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E6EFF8]"
      >
        <div className="p-4 sm:p-6 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-[#688099]">Bugünkü Kayıtlar</p>
            <p className="mt-2 text-2xl font-semibold font-mono tabular-nums text-[#0F233A]">
              {todayLogsCount}
            </p>
          </div>
          <p className="mt-3 text-xs text-[#688099]">
            Toplam saklanan kayıt:{' '}
            <span className="font-mono tabular-nums font-medium text-[#0F233A]">
              {logs.length}
            </span>
          </p>
        </div>

        <div className="p-4 sm:p-6 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-[#688099]">
              Son Belirti Profili (RSI / GERD)
            </p>
            {latestAssessment ? (
              <div className="mt-2">
                <p className="text-base font-semibold text-[#0F233A]">
                  {PROFILE_LABEL_MAP[latestAssessment.profileType]}
                </p>
                <p className="text-xs text-[#455D75] mt-1 font-mono tabular-nums">
                  RSI: {latestAssessment.rsiTotal}/45 · GERD Yükü:{' '}
                  {latestAssessment.gerdqBurdenScore}/18
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-[#688099]">Henüz değerlendirme yapılmadı</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onNavigate('assessment')}
            className="mt-3 text-left text-xs font-medium text-[#155CC0] hover:underline cursor-pointer"
          >
            {latestAssessment
              ? 'Yeni değerlendirme yap →'
              : 'GERD / LPR farkındalık testini başlat →'}
          </button>
        </div>

        <div className="p-4 sm:p-6 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-[#688099]">
              Ortalama Yemek–Uyku Aralığı
            </p>
            <p className="mt-2 text-2xl font-semibold font-mono tabular-nums text-[#0F233A]">
              {sleepStats.avgMealToSleepMinutes !== null
                ? `${Math.floor(sleepStats.avgMealToSleepMinutes / 60)} sa ${
                    sleepStats.avgMealToSleepMinutes % 60
                  } dk`
                : '—'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('detective')}
            className="mt-3 text-left text-xs font-medium text-[#155CC0] hover:underline cursor-pointer"
          >
            Kişisel tetikleyici analizini aç →
          </button>
        </div>
      </section>

      <RecentLogsCard
        recentLogs={recentLogs}
        isDemoLoaded={isDemoLoaded}
        isSignedIn={isSignedIn}
        onNavigate={onNavigate}
        onOpenAuth={onOpenAuth}
        onLoadDemo={onLoadDemo}
      />
    </div>
  );
});
