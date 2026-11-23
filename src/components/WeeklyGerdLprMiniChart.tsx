import { memo, useCallback, useMemo, useState, useTransition } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  Minus,
  PenLine,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  buildWeeklyAxisComparison,
  type AxisTrendSummary,
  type TrendAxisFilter,
  type WeeklyAxisPoint,
} from '../engine/chartWindow';
import type { ActiveTab, RefluxLogEntry } from '../types/reflux';

const CHART_MARGIN = { top: 10, right: 10, left: -20, bottom: 0 } as const;
const AXIS_TICK = { fontSize: 11, fill: '#688099' } as const;
const AXIS_LINE = { stroke: '#DCE7F3' } as const;
const Y_TICKS = [0, 1, 2, 3, 4, 5];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: WeeklyAxisPoint }>;
}

function WeeklyMiniTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;

  return (
    <div className="max-w-[240px] rounded-xl bg-white border border-[#DCE7F3] shadow-[0_10px_24px_-6px_rgba(15,35,58,0.16)] p-3 text-xs space-y-1.5">
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-[#EEF4FA]">
        <span className="font-semibold text-[#0F233A]">
          {pt.isToday ? `Bugün (${pt.dateStr})` : `${pt.label} (${pt.dateStr})`}
        </span>
        <span className="font-mono tabular-nums text-[11px] text-[#688099]">
          {pt.logCount} not
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[#455D75]">
            <span className="w-2 h-2 rounded-full bg-[#1D6FD6]" aria-hidden="true" />
            LPR (Boğaz)
          </span>
          <span className="font-mono tabular-nums font-semibold text-[#155CC0]">
            {pt.lprIntensity}/5
          </span>
        </div>
        {pt.lprSymptoms.length > 0 && (
          <p className="text-[11px] text-[#688099] pl-3.5 leading-snug">
            {pt.lprSymptoms.join(', ')}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span className="inline-flex items-center gap-1.5 text-[#455D75]">
            <span className="w-2 h-2 rounded-full bg-[#B45309]" aria-hidden="true" />
            GERD (Mide)
          </span>
          <span className="font-mono tabular-nums font-semibold text-[#B45309]">
            {pt.gerdIntensity}/5
          </span>
        </div>
        {pt.gerdSymptoms.length > 0 && (
          <p className="text-[11px] text-[#688099] pl-3.5 leading-snug">
            {pt.gerdSymptoms.join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}

function TrendDeltaLabel({ summary }: { summary: AxisTrendSummary }) {
  if (summary.direction === 'none') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[#688099]">
        <Minus className="w-3.5 h-3.5" aria-hidden="true" />
        Belirti kaydı yok
      </span>
    );
  }
  if (summary.direction === 'down') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#047857] font-mono tabular-nums">
        <TrendingDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        Azalış ({summary.delta})
      </span>
    );
  }
  if (summary.direction === 'up') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#B45309] font-mono tabular-nums">
        <TrendingUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        Artış (+{summary.delta})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#455D75]">
      <Minus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      Benzer seyir
    </span>
  );
}

interface WeeklyGerdLprMiniChartProps {
  logs: RefluxLogEntry[];
  todayStr: string;
  onNavigate: (tab: ActiveTab) => void;
}

export const WeeklyGerdLprMiniChart = memo(function WeeklyGerdLprMiniChart({
  logs,
  todayStr,
  onNavigate,
}: WeeklyGerdLprMiniChartProps) {
  const [axisFilter, setAxisFilter] = useState<TrendAxisFilter>('both');
  const [, startTransition] = useTransition();

  const comparison = useMemo(
    () => buildWeeklyAxisComparison(logs, todayStr),
    [logs, todayStr]
  );

  const handleSelectAxis = useCallback((next: TrendAxisFilter) => {
    startTransition(() => {
      setAxisFilter(next);
    });
  }, []);

  const showLpr = axisFilter === 'both' || axisFilter === 'lpr';
  const showGerd = axisFilter === 'both' || axisFilter === 'gerd';

  return (
    <section
      aria-labelledby="weekly-gerd-lpr-heading"
      data-testid="weekly-gerd-lpr-mini-chart"
      data-axis-filter={axisFilter}
      className="bg-white border border-[#DCE7F3] rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5"
    >
      {/* Header & Series Filter Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E6EFF8]">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#155CC0]">
            Son 7 Günlük Yoğunluk Karşılaştırması
          </p>
          <h2
            id="weekly-gerd-lpr-heading"
            className="text-base sm:text-lg font-semibold text-[#0F233A] mt-0.5"
          >
            GERD ve LPR Belirti Eğilimi
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div
            role="group"
            aria-label="Belirti ekseni filtresi"
            className="inline-flex items-center p-1 bg-[#EBF4FF] border border-[#DCE7F3] rounded-lg shrink-0"
          >
            {(
              [
                ['both', 'Karşılaştır'],
                ['lpr', 'LPR'],
                ['gerd', 'GERD'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => handleSelectAxis(val)}
                aria-pressed={axisFilter === val}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  axisFilter === val
                    ? 'bg-white text-[#155CC0] shadow-xs'
                    : 'text-[#455D75] hover:text-[#0F233A]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onNavigate('detective')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#DCE7F3] bg-white text-xs font-medium text-[#155CC0] hover:bg-[#EBF4FF] whitespace-nowrap cursor-pointer"
          >
            Detaylı Analiz
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Increase / Decrease Trend Summary Strip */}
      <div
        data-testid="weekly-trend-summary"
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        <div
          className={`p-3.5 rounded-xl border transition-opacity ${
            showLpr
              ? 'bg-[#F7FBFF] border-[#DCE7F3] opacity-100'
              : 'bg-[#FAFBFD] border-[#E6EFF8] opacity-50'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F233A]">
              <span
                className="w-2.5 h-2.5 rounded-full bg-[#1D6FD6]"
                aria-hidden="true"
              />
              Sessiz Reflü (LPR · Boğaz)
            </span>
            <TrendDeltaLabel summary={comparison.lpr} />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2 text-xs text-[#455D75] font-mono tabular-nums">
            <span>
              7 gün ort.:{' '}
              <strong className="text-[#0F233A]">{comparison.lpr.avg7d}/5</strong>
            </span>
            <span aria-hidden="true" className="text-[#CBD5E1]">·</span>
            <span>
              En yüksek:{' '}
              <strong className="text-[#0F233A]">{comparison.lpr.peak7d}/5</strong>
            </span>
          </div>
        </div>

        <div
          className={`p-3.5 rounded-xl border transition-opacity ${
            showGerd
              ? 'bg-[#FFFDF7] border-[#F3E2C7] opacity-100'
              : 'bg-[#FAFBFD] border-[#E6EFF8] opacity-50'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F233A]">
              <span
                className="w-2.5 h-2.5 rounded-full bg-[#B45309]"
                aria-hidden="true"
              />
              Klasik Reflü (GERD · Mide)
            </span>
            <TrendDeltaLabel summary={comparison.gerd} />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2 text-xs text-[#455D75] font-mono tabular-nums">
            <span>
              7 gün ort.:{' '}
              <strong className="text-[#0F233A]">{comparison.gerd.avg7d}/5</strong>
            </span>
            <span aria-hidden="true" className="text-[#CBD5E1]">·</span>
            <span>
              En yüksek:{' '}
              <strong className="text-[#0F233A]">{comparison.gerd.peak7d}/5</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Recharts Mini Area Comparison */}
      {comparison.totalLogs7d === 0 ? (
        <div className="h-44 rounded-xl bg-[#F7FBFF] border border-[#E6EFF8] flex flex-col items-center justify-center text-center px-4 gap-2">
          <p className="text-sm font-medium text-[#0F233A]">
            Son 7 güne ait henüz kayıt bulunmuyor
          </p>
          <p className="text-xs text-[#688099] max-w-md">
            Öğün ve belirti notu ekledikçe GERD (mide) ve LPR (boğaz) yoğunluğunun gün içindeki artış veya azalışı bu grafikte otomatik çizilir.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('logger')}
            className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1D6FD6] text-white text-xs font-medium hover:bg-[#1659B3] cursor-pointer"
          >
            <PenLine className="w-3.5 h-3.5" aria-hidden="true" />
            İlk Kaydı Ekle
          </button>
        </div>
      ) : (
        <div className="w-full h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={comparison.points} margin={CHART_MARGIN}>
              <defs>
                <linearGradient id="miniLprGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1D6FD6" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#1D6FD6" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="miniGerdGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#B45309" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#B45309" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#E2EEF9"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={AXIS_LINE}
              />
              <YAxis
                domain={[0, 5]}
                ticks={Y_TICKS}
                allowDecimals={false}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<WeeklyMiniTooltip />} />

              {showLpr && (
                <Area
                  type="monotone"
                  dataKey="lprIntensity"
                  name="Sessiz Reflü (LPR)"
                  stroke="#1D6FD6"
                  strokeWidth={2.25}
                  fill="url(#miniLprGrad)"
                  activeDot={{ r: 5, fill: '#1D6FD6', stroke: '#FFFFFF', strokeWidth: 2 }}
                  dot={{ r: 3, fill: '#1D6FD6', strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              )}
              {showGerd && (
                <Area
                  type="monotone"
                  dataKey="gerdIntensity"
                  name="Klasik Reflü (GERD)"
                  stroke="#B45309"
                  strokeWidth={2.25}
                  fill="url(#miniGerdGrad)"
                  activeDot={{ r: 5, fill: '#B45309', stroke: '#FFFFFF', strokeWidth: 2 }}
                  dot={{ r: 3, fill: '#B45309', strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="text-[11px] text-[#688099] leading-relaxed">
        Artış veya azalış göstergesi son 3 gün ile önceki 4 günün ortalama yoğunluğunu kıyaslar; tıbbi değerlendirme değil, kişisel gözlem özetidir.
      </p>
    </section>
  );
});
