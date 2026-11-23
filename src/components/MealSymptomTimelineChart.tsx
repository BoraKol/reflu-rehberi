import {
  memo,
  useCallback,
  useMemo,
  useState,
  useTransition,
} from 'react';
import {
  CartesianGrid,
  Cell,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { Clock, Crosshair, X } from 'lucide-react';
import {
  buildMealSymptomTimeline,
  formatHourTick,
  MAX_TIMELINE_POINTS,
  TIMELINE_DOMAINS,
  type MealTimelinePoint,
  type TimelineDaySlice,
} from '../engine/chartWindow';
import { useViewportVisible } from '../hooks/useViewportVisible';
import type { PersonalPattern, RefluxLogEntry } from '../types/reflux';

const TIMELINE_MARGIN = { top: 14, right: 18, left: -12, bottom: 8 } as const;
const AXIS_TICK = { fontSize: 11, fill: '#688099' } as const;
const AXIS_LINE = { stroke: '#DCE7F3' } as const;
const SEVERITY_TICKS = [0, 1, 2, 3, 4, 5];
const BUBBLE_RANGE: [number, number] = [56, 170];
const DAY_SLICE_ORDER: TimelineDaySlice[] = ['all', 'daytime', 'evening', 'late'];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MealTimelinePoint }>;
}

function TimelineTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;

  return (
    <div className="max-w-[270px] rounded-xl bg-white border border-[#DCE7F3] shadow-[0_10px_28px_-6px_rgba(15,35,58,0.16)] p-3 text-xs space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono tabular-nums font-semibold text-[#0F233A]">
          {pt.dateStr} · {pt.timeHHMM}
        </span>
        <span
          className={`font-mono tabular-nums font-semibold ${
            pt.maxSeverity === 0
              ? 'text-[#047857]'
              : pt.dominantAxis === 'LPR'
                ? 'text-[#155CC0]'
                : 'text-[#B45309]'
          }`}
        >
          {pt.maxSeverity === 0 ? 'Belirtisiz' : `Şiddet ${pt.maxSeverity}/5`}
        </span>
      </div>
      <p className="text-[#0F233A] font-medium leading-snug">{pt.foodsLabel}</p>
      <p className="text-[#455D75] leading-snug">{pt.symptomSummary}</p>
      {typeof pt.mealToSleepMinutes === 'number' && (
        <p className="text-[11px] font-mono tabular-nums text-[#688099]">
          Yemek–Uyku: {Math.floor(pt.mealToSleepMinutes / 60)} sa{' '}
          {pt.mealToSleepMinutes % 60} dk
        </p>
      )}
      <p className="text-[11px] text-[#155CC0] pt-0.5">
        Sabitlemek için noktaya tıklayın
      </p>
    </div>
  );
}

interface MealSymptomTimelineChartProps {
  logs: RefluxLogEntry[];
  observedPatterns: PersonalPattern[];
}

export const MealSymptomTimelineChart = memo(function MealSymptomTimelineChart({
  logs,
  observedPatterns,
}: MealSymptomTimelineChartProps) {
  const [daySlice, setDaySlice] = useState<TimelineDaySlice>('all');
  const [foodFilterId, setFoodFilterId] = useState<string>('ALL');
  const [focusedPointId, setFocusedPointId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const { ref: containerRef, isVisible } = useViewportVisible();

  // Extract food trigger options for quick cross-focus
  const foodFilterOptions = useMemo(() => {
    const opts: Array<{ id: string; label: string }> = [];
    for (let i = 0; i < observedPatterns.length; i++) {
      const p = observedPatterns[i];
      if (p.kind === 'FOOD' && p.key.startsWith('food:')) {
        opts.push({ id: p.key.slice(5), label: p.label });
      }
    }
    return opts;
  }, [observedPatterns]);

  // Memoized meal-time vs symptom projection (capped at MAX_TIMELINE_POINTS)
  const timeline = useMemo(
    () =>
      buildMealSymptomTimeline(
        logs,
        daySlice,
        foodFilterId,
        MAX_TIMELINE_POINTS
      ),
    [logs, daySlice, foodFilterId]
  );

  const focusedPoint = useMemo(() => {
    if (!focusedPointId) return null;
    return timeline.points.find((p) => p.id === focusedPointId) ?? null;
  }, [timeline.points, focusedPointId]);

  const domain = TIMELINE_DOMAINS[daySlice];
  const disableAnimation = logs.length > 150 || timeline.isCapped;

  const handleSelectSlice = useCallback((next: TimelineDaySlice) => {
    startTransition(() => {
      setDaySlice(next);
      setFocusedPointId(null);
    });
  }, []);

  const handleSelectFoodFilter = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      startTransition(() => {
        setFoodFilterId(val);
        setFocusedPointId(null);
      });
    },
    []
  );

  const handlePointClick = useCallback((data: unknown) => {
    const candidate = data as { payload?: MealTimelinePoint; id?: string } | null;
    const ptId = candidate?.payload?.id ?? candidate?.id;
    if (ptId) {
      setFocusedPointId((prev) => (prev === ptId ? null : ptId));
    }
  }, []);

  const handleFocusHighestSeverity = useCallback(() => {
    let best: MealTimelinePoint | null = null;
    for (let i = 0; i < timeline.points.length; i++) {
      const pt = timeline.points[i];
      if (
        !best ||
        pt.maxSeverity > best.maxSeverity ||
        (pt.maxSeverity === best.maxSeverity && pt.hourDecimal > best.hourDecimal)
      ) {
        best = pt;
      }
    }
    if (best) setFocusedPointId(best.id);
  }, [timeline.points]);

  const handleClearFocus = useCallback(() => {
    setFocusedPointId(null);
  }, []);

  const showLateZone = domain.maxHour > 21;
  const lateZoneStart = Math.max(21, domain.minHour);

  return (
    <section
      aria-labelledby="meal-timeline-heading"
      className="bg-white border border-[#DCE7F3] rounded-2xl p-4 sm:p-6 space-y-4"
    >
      {/* Header & Focus Window Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#E6EFF8]">
        <div className="min-w-0">
          <h2
            id="meal-timeline-heading"
            className="text-base font-semibold text-[#0F233A]"
          >
            Yemek Zamanı ve Belirti İlişkisi (Zaman Çizgisi)
          </h2>
          <p className="text-xs text-[#455D75] mt-0.5">
            Günün saatine göre öğünlerin belirti şiddetiyle dağılımı — incelemek için bir zaman dilimine odaklanın veya noktaya tıklayın
          </p>
        </div>

        <div
          role="group"
          aria-label="Günün saat dilimine odaklan"
          className="inline-flex flex-wrap sm:flex-nowrap shrink-0 p-1 bg-[#EBF4FF] border border-[#DCE7F3] rounded-lg self-start"
        >
          {DAY_SLICE_ORDER.map((sliceId) => {
            const cfg = TIMELINE_DOMAINS[sliceId];
            return (
              <button
                key={sliceId}
                type="button"
                onClick={() => handleSelectSlice(sliceId)}
                aria-pressed={daySlice === sliceId}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  daySlice === sliceId
                    ? 'bg-white text-[#155CC0] shadow-xs'
                    : 'text-[#455D75] hover:text-[#0F233A]'
                }`}
              >
                {cfg.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Focused Window Summary Strip + Food Trigger Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div
          data-testid="timeline-focus-summary"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[#455D75]"
        >
          <span className="inline-flex items-center gap-1.5 font-medium text-[#0F233A]">
            <Clock className="w-3.5 h-3.5 text-[#1D6FD6]" aria-hidden="true" />
            {domain.label}
          </span>
          <span aria-hidden="true" className="text-[#CBD5E1]">
            ·
          </span>
          <span className="font-mono tabular-nums">
            <strong className="text-[#0F233A]">{timeline.summary.mealCount}</strong> öğün
          </span>
          <span aria-hidden="true" className="text-[#CBD5E1]">
            ·
          </span>
          <span className="font-mono tabular-nums">
            Belirti oranı:{' '}
            <strong className="text-[#0F233A]">
              {timeline.summary.symptomRate !== null
                ? `%${timeline.summary.symptomRate}`
                : '—'}
            </strong>
          </span>
          {timeline.summary.avgSeverity !== null && (
            <>
              <span aria-hidden="true" className="text-[#CBD5E1]">
                ·
              </span>
              <span className="font-mono tabular-nums">
                Ort. şiddet:{' '}
                <strong className="text-[#0F233A]">
                  {timeline.summary.avgSeverity}/5
                </strong>
              </span>
            </>
          )}
          {timeline.isCapped && (
            <span className="text-[#155CC0] font-medium">
              (Son {MAX_TIMELINE_POINTS} öğün gösteriliyor)
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {foodFilterOptions.length > 0 && (
            <select
              aria-label="Tetikleyici besine göre odaklan"
              value={foodFilterId}
              onChange={handleSelectFoodFilter}
              className="min-h-9 px-2.5 py-1.5 rounded-lg border border-[#DCE7F3] bg-[#F7FBFF] text-base sm:text-xs font-medium text-[#0F233A] focus:outline-none focus:border-[#1D6FD6] cursor-pointer"
            >
              <option value="ALL">Tüm Besinler</option>
              {foodFilterOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {timeline.points.length > 0 && (
            <button
              type="button"
              onClick={handleFocusHighestSeverity}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#DCE7F3] bg-white text-xs font-medium text-[#155CC0] hover:bg-[#EBF4FF] whitespace-nowrap cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
              En Şiddetliye Odaklan
            </button>
          )}
        </div>
      </div>

      {/* Interactive Recharts Scatter Timeline */}
      <div
        ref={containerRef}
        className="w-full h-72"
        data-testid="meal-symptom-timeline"
        data-timeline-slice={daySlice}
        data-timeline-points={timeline.points.length}
      >
        {!isVisible ? (
          <div className="w-full h-full rounded-xl bg-[#F7FBFF] border border-[#E6EFF8] flex items-center justify-center text-xs text-[#688099]">
            Zaman çizgisi görünür alana geldiğinde yükleniyor…
          </div>
        ) : timeline.points.length === 0 ? (
          <div className="w-full h-full rounded-xl bg-[#F7FBFF] border border-[#E6EFF8] flex flex-col items-center justify-center gap-1.5 text-center px-4">
            <p className="text-sm font-medium text-[#0F233A]">
              Bu zaman diliminde eşleşen öğün kaydı yok
            </p>
            <p className="text-xs text-[#455D75]">
              Farklı bir saat aralığı seçebilir veya besin filtresini sıfırlayabilirsiniz.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={TIMELINE_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2EEF9" />

              {showLateZone && (
                <ReferenceArea
                  x1={lateZoneStart}
                  x2={domain.maxHour}
                  y1={0}
                  y2={5}
                  fill="#FEF2F2"
                  fillOpacity={0.55}
                />
              )}

              {showLateZone && domain.minHour <= 21 && (
                <ReferenceLine
                  x={21}
                  stroke="#DC2626"
                  strokeDasharray="4 4"
                  strokeOpacity={0.55}
                  label={{
                    value: '21:00 Geç Öğün Eşiği',
                    position: 'insideTopRight',
                    fill: '#B91C1C',
                    fontSize: 11,
                  }}
                />
              )}

              {focusedPoint && (
                <ReferenceLine
                  x={focusedPoint.hourDecimal}
                  stroke="#1D6FD6"
                  strokeDasharray="3 3"
                  strokeOpacity={0.65}
                />
              )}

              <XAxis
                type="number"
                dataKey="hourDecimal"
                name="Yemek Saati"
                domain={[domain.minHour, domain.maxHour]}
                ticks={domain.ticks}
                tickFormatter={formatHourTick}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={AXIS_LINE}
              />
              <YAxis
                type="number"
                dataKey="maxSeverity"
                name="Belirti Şiddeti"
                domain={[0, 5]}
                ticks={SEVERITY_TICKS}
                allowDecimals={false}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={AXIS_LINE}
              />
              <ZAxis
                type="number"
                dataKey="bubbleSize"
                range={BUBBLE_RANGE}
                name="Etki"
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3', stroke: '#93C5FD' }}
                content={<TimelineTooltip />}
              />

              <Scatter
                name="Belirtisiz Öğün (0/5)"
                data={timeline.symptomFreePoints}
                fill="#047857"
                onClick={handlePointClick}
                isAnimationActive={!disableAnimation}
              >
                {timeline.symptomFreePoints.map((pt) => (
                  <Cell
                    key={pt.id}
                    cursor="pointer"
                    fill="#047857"
                    fillOpacity={focusedPointId && focusedPointId !== pt.id ? 0.3 : 0.85}
                    stroke={focusedPointId === pt.id ? '#0F233A' : '#FFFFFF'}
                    strokeWidth={focusedPointId === pt.id ? 2.5 : 1.5}
                  />
                ))}
              </Scatter>

              <Scatter
                name="Sessiz Reflü (LPR)"
                data={timeline.lprPoints}
                fill="#1D6FD6"
                onClick={handlePointClick}
                isAnimationActive={!disableAnimation}
              >
                {timeline.lprPoints.map((pt) => (
                  <Cell
                    key={pt.id}
                    cursor="pointer"
                    fill="#1D6FD6"
                    fillOpacity={focusedPointId && focusedPointId !== pt.id ? 0.3 : 0.88}
                    stroke={focusedPointId === pt.id ? '#0F233A' : '#FFFFFF'}
                    strokeWidth={focusedPointId === pt.id ? 2.5 : 1.5}
                  />
                ))}
              </Scatter>

              <Scatter
                name="Klasik Reflü (GERD) / Karma"
                data={timeline.gerdOrMixedPoints}
                fill="#B45309"
                onClick={handlePointClick}
                isAnimationActive={!disableAnimation}
              >
                {timeline.gerdOrMixedPoints.map((pt) => (
                  <Cell
                    key={pt.id}
                    cursor="pointer"
                    fill="#B45309"
                    fillOpacity={focusedPointId && focusedPointId !== pt.id ? 0.3 : 0.9}
                    stroke={focusedPointId === pt.id ? '#0F233A' : '#FFFFFF'}
                    strokeWidth={focusedPointId === pt.id ? 2.5 : 1.5}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Clean Legend Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-[#455D75]">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1D6FD6]" aria-hidden="true" />
            Sessiz Reflü (LPR)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B45309]" aria-hidden="true" />
            Klasik Reflü (GERD) / Karma
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#047857]" aria-hidden="true" />
            Belirtisiz Öğün
          </span>
        </div>
        <span className="text-[11px] text-[#688099]">
          Daha büyük daireler 3 saatten kısa yemek–uyku aralığını gösterir
        </span>
      </div>

      {/* Focused Event Inspector Panel (appears when user clicks a dot or "En Şiddetliye Odaklan") */}
      {focusedPoint && (
        <div
          data-testid="timeline-focused-event"
          className="p-4 rounded-xl bg-[#F7FBFF] border border-[#BBD6F7] flex flex-col sm:flex-row sm:items-start justify-between gap-3"
        >
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-[#155CC0]">
                Odaklanılan Öğün
              </span>
              <span aria-hidden="true" className="text-[#8BA0B5]">
                ·
              </span>
              <span className="font-mono tabular-nums font-semibold text-[#0F233A]">
                {focusedPoint.dateStr} · {focusedPoint.timeHHMM}
              </span>
              {typeof focusedPoint.mealToSleepMinutes === 'number' && (
                <>
                  <span aria-hidden="true" className="text-[#8BA0B5]">
                    ·
                  </span>
                  <span className="font-mono tabular-nums text-[#455D75]">
                    Yemek–Uyku: {Math.floor(focusedPoint.mealToSleepMinutes / 60)}{' '}
                    sa {focusedPoint.mealToSleepMinutes % 60} dk
                  </span>
                </>
              )}
            </div>
            <p className="text-sm font-medium text-[#0F233A]">
              {focusedPoint.foodsLabel}
            </p>
            <p className="text-xs text-[#455D75] leading-relaxed">
              {focusedPoint.rawText}
            </p>
            <p className="text-xs font-medium text-[#0F233A]">
              Belirtiler:{' '}
              <span
                className={
                  focusedPoint.maxSeverity > 0
                    ? 'text-[#B91C1C]'
                    : 'text-[#047857]'
                }
              >
                {focusedPoint.symptomSummary}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={handleClearFocus}
            aria-label="Odaklanmayı kaldır"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#DCE7F3] bg-white text-xs font-medium text-[#455D75] hover:text-[#0F233A] hover:bg-[#EBF4FF] whitespace-nowrap shrink-0 self-start cursor-pointer"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
            Kapat
          </button>
        </div>
      )}
    </section>
  );
});
