import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import {
  CHART_WINDOW_STEP,
  DEFAULT_CHART_WINDOW_SIZE,
  filterTrendSeries,
  sliceVisibilityWindow,
  type TrendAxisFilter,
  type TrendRangeOption,
} from '../engine/chartWindow';
import {
  computeDailyTrends,
  computePersonalPatterns,
  computeSleepGapComparison,
  MIN_SAMPLE_SIZE,
} from '../engine/correlationEngine';
import type {
  ActiveTab,
  AppPersistedState,
  DailyTrendPoint,
  PersonalPattern,
  RefluxLogEntry,
  SleepGapComparison,
} from '../types/reflux';
import { useViewportVisible } from '../hooks/useViewportVisible';
import { DataBackupNotice } from './DataBackupNotice';
import { MealSymptomTimelineChart } from './MealSymptomTimelineChart';
import { PageHeader } from './ui/PageHeader';

const INITIAL_PATTERN_LIMIT = 15;
const PATTERN_PAGE_STEP = 15;
const INITIAL_OCCURRENCE_LIMIT = 12;
const OCCURRENCE_PAGE_STEP = 20;

const CHART_MARGIN = { top: 8, right: 12, left: -16, bottom: 0 } as const;
const AXIS_TICK = { fontSize: 11, fill: '#688099' } as const;
const AXIS_LINE = { stroke: '#DCE7F3' } as const;
const TOOLTIP_STYLE = {
  backgroundColor: '#FFFFFF',
  borderColor: '#DCE7F3',
  borderRadius: '10px',
  fontSize: '12px',
} as const;
const LEGEND_STYLE = { fontSize: '12px', paddingTop: '8px' } as const;

interface PatternRowProps {
  pattern: PersonalPattern;
  isOpen: boolean;
  onToggle: (id: string) => void;
}

const PatternRow = memo(function PatternRow({
  pattern,
  isOpen,
  onToggle,
}: PatternRowProps) {
  const [occLimit, setOccLimit] = useState(INITIAL_OCCURRENCE_LIMIT);

  const handleToggle = useCallback(() => {
    onToggle(pattern.id);
  }, [onToggle, pattern.id]);

  const handleShowMoreOcc = useCallback(() => {
    setOccLimit((prev) => prev + OCCURRENCE_PAGE_STEP);
  }, []);

  const visibleOccurrences = useMemo(
    () => (isOpen ? pattern.occurrences.slice(0, occLimit) : []),
    [isOpen, pattern.occurrences, occLimit]
  );

  const barColor =
    pattern.ratioPercent >= 65
      ? 'bg-[#B91C1C]'
      : pattern.ratioPercent >= 35
        ? 'bg-[#B45309]'
        : 'bg-[#047857]';

  return (
    <li className="py-4 space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-[#0F233A]">
              {pattern.label}
            </h3>
            <span className="text-xs text-[#688099]">
              · {pattern.kind === 'FOOD' ? 'Besin' : 'Öğün Zamanlaması'}
            </span>
          </div>
          <p className="text-xs text-[#455D75]">{pattern.summaryText}</p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="font-mono tabular-nums text-sm font-semibold text-[#0F233A]">
              {pattern.symptomOccurrences} / {pattern.totalOccurrences} gün — %
              {pattern.ratioPercent}
            </p>
            <div className="w-32 h-1.5 bg-[#E2EEF9] rounded-full overflow-hidden mt-1 ml-auto">
              <div
                className={`h-full rounded-full ${barColor}`}
                style={{ width: `${pattern.ratioPercent}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggle}
            aria-expanded={isOpen}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#DCE7F3] bg-[#F7FBFF] text-xs font-medium text-[#155CC0] hover:bg-[#EBF4FF] whitespace-nowrap cursor-pointer"
          >
            Hangi günler?
            {isOpen ? (
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mt-2 bg-[#F7FBFF] border border-[#DCE7F3] rounded-xl p-4 space-y-3">
          <p className="text-xs font-medium text-[#455D75]">
            Bu orana dahil edilen kayıtlar ({pattern.occurrences.length} kayıt):
          </p>
          <ul className="divide-y divide-[#E6EFF8] text-xs">
            {visibleOccurrences.map((occ, idx) => (
              <li
                key={`${pattern.id}-occ-${occ.dateStr}-${occ.timeHHMM}-${idx}`}
                className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <span className="font-mono tabular-nums font-medium text-[#0F233A]">
                    {occ.dateStr} · {occ.timeHHMM}
                  </span>
                  <p className="text-[#455D75] mt-0.5">{occ.rawText}</p>
                </div>
                <span
                  className={`shrink-0 font-medium px-2 py-0.5 rounded ${
                    occ.hadSymptom
                      ? 'bg-[#FEF2F2] text-[#B91C1C]'
                      : 'bg-[#ECFDF5] text-[#047857]'
                  }`}
                >
                  {occ.symptomSummary}
                </span>
              </li>
            ))}
          </ul>
          {pattern.occurrences.length > occLimit && (
            <button
              type="button"
              onClick={handleShowMoreOcc}
              className="text-xs font-medium text-[#155CC0] hover:underline cursor-pointer"
            >
              Daha fazla kayıt göster ({pattern.occurrences.length - occLimit} kaldı)
            </button>
          )}
        </div>
      )}
    </li>
  );
});

const TREND_RANGE_OPTIONS: ReadonlyArray<{
  value: TrendRangeOption;
  label: string;
}> = [
  { value: 14, label: '14 Gün' },
  { value: 30, label: '30 Gün' },
  { value: 90, label: '90 Gün' },
  { value: 'all', label: 'Tümü' },
];

const AXIS_FILTER_OPTIONS: ReadonlyArray<{
  value: TrendAxisFilter;
  label: string;
}> = [
  { value: 'both', label: 'Tüm Belirtiler' },
  { value: 'lpr', label: 'Sessiz Reflü (LPR)' },
  { value: 'gerd', label: 'Klasik Reflü (GERD)' },
];

interface GerdLprTrendChartProps {
  dailyTrends: DailyTrendPoint[];
  trendRange: TrendRangeOption;
  isLargeDataset: boolean;
  onSelectRange: (range: TrendRangeOption) => void;
}

const GerdLprTrendChart = memo(function GerdLprTrendChart({
  dailyTrends,
  trendRange,
  isLargeDataset,
  onSelectRange,
}: GerdLprTrendChartProps) {
  const [axisFilter, setAxisFilter] = useState<TrendAxisFilter>('both');
  const [onlySymptomDays, setOnlySymptomDays] = useState(false);
  const [windowOffset, setWindowOffset] = useState(0);
  const [, startFilterTransition] = useTransition();

  const { ref: chartContainerRef, isVisible: isChartVisible } = useViewportVisible();

  // Reset sliding window offset to latest dates when range or filter changes
  useEffect(() => {
    setWindowOffset(0);
  }, [trendRange, axisFilter, onlySymptomDays, dailyTrends.length]);

  // 1) Memoized data filtering (axis + symptom-only toggle)
  const filteredTrends = useMemo(
    () => filterTrendSeries(dailyTrends, axisFilter, onlySymptomDays),
    [dailyTrends, axisFilter, onlySymptomDays]
  );

  // 2) Memoized sliding visibility window (caps rendered SVG points at <= 30)
  const windowState = useMemo(
    () =>
      sliceVisibilityWindow(
        filteredTrends,
        windowOffset,
        DEFAULT_CHART_WINDOW_SIZE
      ),
    [filteredTrends, windowOffset]
  );

  const maxOffset = Math.max(0, windowState.totalPoints - windowState.windowSize);
  const clampedOffset = Math.min(maxOffset, Math.max(0, windowOffset));

  const handleSelectAxis = useCallback((nextAxis: TrendAxisFilter) => {
    startFilterTransition(() => {
      setAxisFilter(nextAxis);
    });
  }, []);

  const handleToggleSymptomOnly = useCallback(() => {
    startFilterTransition(() => {
      setOnlySymptomDays((prev) => !prev);
    });
  }, []);

  const handleStepPrev = useCallback(() => {
    setWindowOffset((prev) => Math.min(maxOffset, prev + CHART_WINDOW_STEP));
  }, [maxOffset]);

  const handleStepNext = useCallback(() => {
    setWindowOffset((prev) => Math.max(0, prev - CHART_WINDOW_STEP));
  }, []);

  const handleJumpLatest = useCallback(() => {
    setWindowOffset(0);
  }, []);

  const handleScrubChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Slider moves left (oldest, offset = maxOffset) -> right (latest, offset = 0)
      const sliderVal = Number(e.target.value);
      setWindowOffset(Math.max(0, maxOffset - sliderVal));
    },
    [maxOffset]
  );

  const disableAnimation = isLargeDataset || windowState.isWindowed;
  const showLpr = axisFilter === 'both' || axisFilter === 'lpr';
  const showGerd = axisFilter === 'both' || axisFilter === 'gerd';

  return (
    <section className="bg-white border border-[#DCE7F3] rounded-2xl p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E6EFF8]">
        <div>
          <h2 className="text-base font-semibold text-[#0F233A]">
            Klasik Reflü (GERD) vs. Sessiz Reflü (LPR) Zaman Grafiği
          </h2>
          <p className="text-xs text-[#455D75] mt-0.5">
            Günlük kaydedilen belirti şiddeti toplamlarının iki eksende karşılaştırması
          </p>
        </div>
        <div
          role="group"
          aria-label="Grafik zaman aralığı"
          className="inline-flex p-1 bg-[#EBF4FF] border border-[#DCE7F3] rounded-lg self-start"
        >
          {TREND_RANGE_OPTIONS.map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => onSelectRange(opt.value)}
              aria-pressed={trendRange === opt.value}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                trendRange === opt.value
                  ? 'bg-white text-[#155CC0] shadow-xs'
                  : 'text-[#455D75] hover:text-[#0F233A]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Memoized Axis & Symptom Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Belirti ekseni filtresi"
          className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#F7FBFF] border border-[#E2EEF9] rounded-lg"
        >
          {AXIS_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelectAxis(opt.value)}
              aria-pressed={axisFilter === opt.value}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                axisFilter === opt.value
                  ? 'bg-white text-[#155CC0] shadow-xs'
                  : 'text-[#455D75] hover:text-[#0F233A]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-medium text-[#455D75] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlySymptomDays}
            onChange={handleToggleSymptomOnly}
            className="w-3.5 h-3.5 rounded border-[#C6D9ED] accent-[#1D6FD6] cursor-pointer"
          />
          <span>Yalnızca belirtili günler</span>
        </label>
      </div>

      {/* Sliding Visibility Window Controls (active automatically when points > 30) */}
      {windowState.isWindowed && (
        <div
          data-testid="chart-visibility-window"
          className="px-4 py-3 rounded-xl bg-[#F7FBFF] border border-[#DCE7F3] flex flex-col md:flex-row md:items-center justify-between gap-3"
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="font-semibold text-[#155CC0]">
              Görünürlük Penceresi
            </span>
            <span aria-hidden="true" className="text-[#8BA0B5]">
              ·
            </span>
            <span
              data-testid="chart-window-range"
              className="font-mono tabular-nums font-medium text-[#0F233A]"
            >
              {windowState.rangeLabel}
            </span>
            <span aria-hidden="true" className="text-[#8BA0B5]">
              ·
            </span>
            <span className="font-mono tabular-nums text-[#455D75]">
              {windowState.visiblePoints.length} / {windowState.totalPoints} gün gösteriliyor
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleStepPrev}
              disabled={!windowState.canStepPrev}
              aria-label="Önceki tarih penceresi"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#DCE7F3] bg-white text-xs font-medium text-[#0F233A] hover:bg-[#EBF4FF] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
              Önceki
            </button>

            <input
              type="range"
              min={0}
              max={maxOffset}
              value={maxOffset - clampedOffset}
              onChange={handleScrubChange}
              aria-label="Görünürlük penceresi tarih kaydırıcısı"
              className="w-24 sm:w-32 accent-[#1D6FD6] cursor-pointer"
            />

            <button
              type="button"
              onClick={handleStepNext}
              disabled={!windowState.canStepNext}
              aria-label="Sonraki tarih penceresi"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#DCE7F3] bg-white text-xs font-medium text-[#0F233A] hover:bg-[#EBF4FF] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
            >
              Sonraki
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>

            {clampedOffset > 0 && (
              <button
                type="button"
                onClick={handleJumpLatest}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#BBD6F7] bg-[#EBF4FF] text-xs font-medium text-[#155CC0] hover:bg-[#DCEBFE] whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                En Güncel
              </button>
            )}
          </div>
        </div>
      )}

      <div
        ref={chartContainerRef}
        className="w-full h-72"
        data-testid="gerd-lpr-chart"
        data-rendered-points={windowState.visiblePoints.length}
      >
        {!isChartVisible ? (
          <div className="w-full h-full rounded-xl bg-[#F7FBFF] border border-[#E6EFF8] flex items-center justify-center text-xs text-[#688099]">
            Grafik görünür alana geldiğinde yükleniyor…
          </div>
        ) : windowState.visiblePoints.length === 0 ? (
          <div className="w-full h-full rounded-xl bg-[#F7FBFF] border border-[#E6EFF8] flex flex-col items-center justify-center gap-2 text-center px-4">
            <p className="text-sm font-medium text-[#0F233A]">
              Seçili filtrede gösterilecek belirti günü bulunamadı
            </p>
            <p className="text-xs text-[#455D75]">
              Tüm günleri görmek için &ldquo;Yalnızca belirtili günler&rdquo; filtresini kapatabilir veya zaman aralığını genişletebilirsiniz.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={windowState.visiblePoints} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2EEF9" />
              <XAxis
                dataKey="label"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={AXIS_LINE}
                minTickGap={16}
              />
              <YAxis
                allowDecimals={false}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={AXIS_LINE}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={LEGEND_STYLE} />
              {showLpr && (
                <Area
                  type="monotone"
                  dataKey="lprScore"
                  name="Sessiz Reflü (LPR · Boğaz)"
                  stroke="#1D6FD6"
                  fill="#DBEAFE"
                  fillOpacity={0.6}
                  strokeWidth={2}
                  isAnimationActive={!disableAnimation}
                />
              )}
              {showGerd && (
                <Area
                  type="monotone"
                  dataKey="gerdScore"
                  name="Klasik Reflü (GERD · Mide)"
                  stroke="#B45309"
                  fill="#FEF3C7"
                  fillOpacity={0.45}
                  strokeWidth={2}
                  isAnimationActive={!disableAnimation}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
});

const SleepGapComparisonSection = memo(function SleepGapComparisonSection({
  sleepGap,
}: {
  sleepGap: SleepGapComparison;
}) {
  return (
    <section className="bg-white border border-[#DCE7F3] rounded-2xl p-4 sm:p-6 space-y-4">
      <div className="pb-4 border-b border-[#E6EFF8]">
        <h2 className="text-base font-semibold text-[#0F233A]">
          Yemek–Uyku Aralığı Etkisi (&lt; 3 Saat vs. ≥ 3 Saat)
        </h2>
        <p className="text-xs text-[#455D75] mt-0.5">
          Yatış saati kaydedilmiş öğünlerde 3 saat sınırının belirti sıklığına ve şiddetine etkisi
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl bg-[#FEF2F2]/50 border border-[#FECACA] space-y-2">
          <p className="text-xs font-semibold text-[#B91C1C]">
            3 Saatten Kısa Aralık (&lt; 3 saat)
          </p>
          <p className="font-mono tabular-nums text-2xl font-semibold text-[#0F233A]">
            {sleepGap.shortGapSymptomRate !== null
              ? `%${sleepGap.shortGapSymptomRate} belirti oranı`
              : 'Veri yok'}
          </p>
          <p className="text-xs text-[#455D75] tabular-nums">
            Kayıtlı gece: {sleepGap.shortGapCount} · Ort. en yüksek şiddet:{' '}
            {sleepGap.shortGapAvgSeverity !== null
              ? `${sleepGap.shortGapAvgSeverity} / 5`
              : '—'}
          </p>
        </div>

        <div className="p-5 rounded-xl bg-[#ECFDF5]/60 border border-[#A7F3D0] space-y-2">
          <p className="text-xs font-semibold text-[#047857]">
            Güvenli Aralık (≥ 3 saat)
          </p>
          <p className="font-mono tabular-nums text-2xl font-semibold text-[#0F233A]">
            {sleepGap.safeGapSymptomRate !== null
              ? `%${sleepGap.safeGapSymptomRate} belirti oranı`
              : 'Veri yok'}
          </p>
          <p className="text-xs text-[#455D75] tabular-nums">
            Kayıtlı gece: {sleepGap.safeGapCount} · Ort. en yüksek şiddet:{' '}
            {sleepGap.safeGapAvgSeverity !== null
              ? `${sleepGap.safeGapAvgSeverity} / 5`
              : '—'}
          </p>
        </div>
      </div>
    </section>
  );
});

interface DetectiveViewProps {
  logs: RefluxLogEntry[];
  state: AppPersistedState;
  onNavigate: (tab: ActiveTab) => void;
  onLoadDemo: () => void;
  onOpenPrivacyPolicy?: () => void;
}

export const DetectiveView = memo(function DetectiveView({
  logs,
  state,
  onNavigate,
  onLoadDemo,
  onOpenPrivacyPolicy,
}: DetectiveViewProps) {
  const [trendRange, setTrendRange] = useState<TrendRangeOption>(14);
  const [expandedPatternId, setExpandedPatternId] = useState<string | null>(null);
  const [patternLimit, setPatternLimit] = useState(INITIAL_PATTERN_LIMIT);
  const [, startTransition] = useTransition();

  const { observedPatterns, pendingPatterns } = useMemo(() => {
    const all = computePersonalPatterns(logs);
    const observed: PersonalPattern[] = [];
    const pending: PersonalPattern[] = [];
    for (let i = 0; i < all.length; i++) {
      if (all[i].meetsMinSample) observed.push(all[i]);
      else pending.push(all[i]);
    }
    return { observedPatterns: observed, pendingPatterns: pending };
  }, [logs]);

  const visibleObservedPatterns = useMemo(
    () => observedPatterns.slice(0, patternLimit),
    [observedPatterns, patternLimit]
  );

  const visiblePendingPatterns = useMemo(
    () => pendingPatterns.slice(0, 9),
    [pendingPatterns]
  );

  const dailyTrends = useMemo(
    () => computeDailyTrends(logs, trendRange),
    [logs, trendRange]
  );

  const sleepGap = useMemo(() => computeSleepGapComparison(logs), [logs]);

  const handleTogglePattern = useCallback((id: string) => {
    setExpandedPatternId((prev) => (prev === id ? null : id));
  }, []);

  const handleSelectTrendRange = useCallback((range: TrendRangeOption) => {
    startTransition(() => {
      setTrendRange(range);
    });
  }, []);

  const handleShowMorePatterns = useCallback(() => {
    setPatternLimit((prev) => prev + PATTERN_PAGE_STEP);
  }, []);

  const handleGoLogger = useCallback(() => {
    onNavigate('logger');
  }, [onNavigate]);

  if (logs.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-medium text-[#455D75] mb-1">
            Kişisel Öğün ve Belirti Analizi
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#0F233A]">
            Kişisel Tetikleyici Dedektifi
          </h1>
        </div>

        <DataBackupNotice
          state={state}
          onOpenPrivacyPolicy={onOpenPrivacyPolicy}
        />

        <div className="bg-white border border-[#DCE7F3] rounded-2xl p-10 text-center max-w-lg mx-auto space-y-4">
          <p className="text-base font-semibold text-[#0F233A]">
            Analiz için henüz kişisel kaydınız yok
          </p>
          <p className="text-sm text-[#455D75] leading-relaxed">
            ReflüRehber tek bir kayıttan sahte korelasyon üretmez. Öğün ve belirti kayıtlarınızı ekledikçe (aynı etken için en az {MIN_SAMPLE_SIZE} kayıt) kişisel örüntüleriniz burada kesin oranlarla hesaplanır.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleGoLogger}
              className="px-4 py-2 rounded-lg bg-[#1D6FD6] text-white text-xs font-medium hover:bg-[#1659B3] cursor-pointer"
            >
              İlk Kaydı Ekle
            </button>
            <button
              type="button"
              onClick={onLoadDemo}
              className="px-4 py-2 rounded-lg border border-[#DCE7F3] bg-white text-xs font-medium text-[#0F233A] hover:bg-[#F4F8FC] cursor-pointer"
            >
              14 Günlük Örnek Önizle
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Kişisel Öğün ve Belirti Analizi"
        title="Kişisel Tetikleyici Dedektifi"
      />

      <DataBackupNotice
        state={state}
        onOpenPrivacyPolicy={onOpenPrivacyPolicy}
      />

      {/* SECTION 1: VERIFIED PERSONAL PATTERNS (>= 3 occurrences) */}
      <section className="bg-white border border-[#DCE7F3] rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E6EFF8]">
          <div>
            <h2 className="text-base font-semibold text-[#0F233A]">
              Gözlemlenen Kişisel Örüntüler (En az {MIN_SAMPLE_SIZE} kayıt)
            </h2>
            <p className="text-xs text-[#455D75] mt-0.5">
              Her oranın arkasındaki kesin günleri görmek için &ldquo;Hangi günler?&rdquo; düğmesine tıklayabilirsiniz.
            </p>
          </div>
          <span className="font-mono tabular-nums text-xs text-[#688099]">
            {observedPatterns.length} örüntü eşiği geçti
          </span>
        </div>

        {observedPatterns.length === 0 ? (
          <p className="text-sm text-[#455D75] py-4">
            Henüz aynı besin veya alışkanlık için {MIN_SAMPLE_SIZE} kayda ulaşılmadı. Kayıt sayınız arttıkça güvenilir kişisel örüntüler burada listelenecektir.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-[#E6EFF8]">
              {visibleObservedPatterns.map((pattern) => (
                <PatternRow
                  key={pattern.id}
                  pattern={pattern}
                  isOpen={expandedPatternId === pattern.id}
                  onToggle={handleTogglePattern}
                />
              ))}
            </ul>
            {observedPatterns.length > patternLimit && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleShowMorePatterns}
                  className="px-4 py-2 rounded-lg border border-[#DCE7F3] bg-[#F7FBFF] text-xs font-medium text-[#155CC0] hover:bg-[#EBF4FF] cursor-pointer"
                >
                  Daha fazla örüntü göster ({observedPatterns.length - patternLimit} kaldı)
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* SECTION 2: GERD vs LPR TIME CHART (ISOLATED MEMOIZED RECHARTS + VISIBILITY WINDOW) */}
      <GerdLprTrendChart
        dailyTrends={dailyTrends}
        trendRange={trendRange}
        isLargeDataset={logs.length > 200}
        onSelectRange={handleSelectTrendRange}
      />

      {/* SECTION 2B: INTERACTIVE FOCUSABLE MEAL-TIME vs SYMPTOM TIMELINE */}
      <MealSymptomTimelineChart
        logs={logs}
        observedPatterns={observedPatterns}
      />

      {/* SECTION 3: MEAL-TO-SLEEP GAP COMPARISON */}
      <SleepGapComparisonSection sleepGap={sleepGap} />

      {/* SECTION 4: MINIMUM SAMPLE GUARD (< 3 OCCURRENCES) */}
      {visiblePendingPatterns.length > 0 && (
        <section className="bg-white border border-[#DCE7F3] rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="pb-3 border-b border-[#E6EFF8]">
            <h2 className="text-sm font-semibold text-[#0F233A]">
              Takip Altındaki Kayıtlar ({MIN_SAMPLE_SIZE} kayıttan az)
            </h2>
            <p className="text-xs text-[#688099] mt-0.5">
              1 veya 2 gözlemden tesadüfi çıkarım yapmamak için bu öğeler en az {MIN_SAMPLE_SIZE} kayda ulaşana kadar beklemede tutulur.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visiblePendingPatterns.map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-xl bg-[#F7FBFF] border border-[#E2EEF9] space-y-1"
              >
                <p className="text-xs font-semibold text-[#0F233A]">
                  {p.label}
                </p>
                <p className="text-xs text-[#688099] tabular-nums">
                  Örüntü tespiti için en az {MIN_SAMPLE_SIZE} kayıt gerekli (Mevcut:{' '}
                  {p.totalOccurrences}/{MIN_SAMPLE_SIZE})
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
});
