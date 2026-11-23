import { memo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Layers,
  RotateCcw,
  Scale,
} from 'lucide-react';
import {
  FOOD_SEGMENT_META,
  FOOD_SEGMENTS_ORDER,
  type FoodSegmentCounts,
  type FoodSegmentPercentages,
} from '../engine/foodSegments';
import type { ConsensusLevel } from '../types/reflux';

export const SEGMENT_VISUAL_STYLES: Record<
  ConsensusLevel,
  {
    icon: typeof CheckCircle2;
    tabActive: string;
    headerBg: string;
    headerText: string;
    barBg: string;
    pctText: string;
  }
> = {
  generally_tolerated: {
    icon: CheckCircle2,
    tabActive: 'border-[#047857] bg-[#ECFDF5] text-[#065F46]',
    headerBg: 'bg-[#F0FDF4] border-[#DCFCE7]',
    headerText: 'text-[#065F46]',
    barBg: 'bg-[#10B981]',
    pctText: 'text-[#047857]',
  },
  individual_varies: {
    icon: Scale,
    tabActive: 'border-[#B45309] bg-[#FFFBEB] text-[#92400E]',
    headerBg: 'bg-[#FFFBEB] border-[#FEF3C7]',
    headerText: 'text-[#92400E]',
    barBg: 'bg-[#F59E0B]',
    pctText: 'text-[#B45309]',
  },
  common_trigger: {
    icon: AlertTriangle,
    tabActive: 'border-[#B91C1C] bg-[#FEF2F2] text-[#991B1B]',
    headerBg: 'bg-[#FEF2F2] border-[#FEE2E2]',
    headerText: 'text-[#991B1B]',
    barBg: 'bg-[#EF4444]',
    pctText: 'text-[#B91C1C]',
  },
};

interface FoodSegmentFilterBarProps {
  consensusFilter: 'ALL' | ConsensusLevel;
  counts: FoodSegmentCounts;
  percentages: FoodSegmentPercentages;
  hasActiveFilters: boolean;
  onSelectConsensus: (next: 'ALL' | ConsensusLevel) => void;
  onResetFilters: () => void;
}

export const FoodSegmentFilterBar = memo(function FoodSegmentFilterBar({
  consensusFilter,
  counts,
  percentages,
  hasActiveFilters,
  onSelectConsensus,
  onResetFilters,
}: FoodSegmentFilterBarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="group"
          aria-label="Besin tolerans kategorisi segment filtresi"
          data-testid="food-segment-tabs"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 flex-1"
        >
          <button
            type="button"
            onClick={() => onSelectConsensus('ALL')}
            aria-pressed={consensusFilter === 'ALL'}
            className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
              consensusFilter === 'ALL'
                ? 'border-[#1D6FD6] bg-[#EBF4FF] text-[#155CC0]'
                : 'border-[#DCE7F3] bg-white text-[#455D75] hover:bg-[#F7FBFF] hover:text-[#0F233A]'
            }`}
          >
            <span className="inline-flex items-center gap-2 min-w-0">
              <Layers
                className={`w-3.5 h-3.5 shrink-0 ${
                  consensusFilter === 'ALL' ? 'text-[#155CC0]' : 'text-[#688099]'
                }`}
                aria-hidden="true"
              />
              <span className="truncate">Tüm Segmentler</span>
            </span>
            <span className="font-mono tabular-nums font-semibold shrink-0">
              {counts.total}
            </span>
          </button>

          {FOOD_SEGMENTS_ORDER.map((segId) => {
            const meta = FOOD_SEGMENT_META[segId];
            const style = SEGMENT_VISUAL_STYLES[segId];
            const Icon = style.icon;
            const count = counts[segId];
            const pct = percentages[segId];
            const isActive = consensusFilter === segId;
            const isEmpty = count === 0;

            return (
              <button
                key={segId}
                type="button"
                onClick={() =>
                  onSelectConsensus(isActive ? 'ALL' : segId)
                }
                aria-pressed={isActive}
                className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? style.tabActive
                    : isEmpty
                      ? 'border-[#E6EFF8] bg-[#F8FBFE] text-[#8BA0B5] hover:bg-[#F1F6FC]'
                      : 'border-[#DCE7F3] bg-white text-[#455D75] hover:bg-[#F7FBFF] hover:text-[#0F233A]'
                }`}
              >
                <span className="inline-flex items-center gap-2 min-w-0">
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive
                        ? ''
                        : isEmpty
                          ? 'text-[#9DB2C7]'
                          : style.headerText
                    }`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{meta.title}</span>
                </span>
                <span className="inline-flex items-baseline gap-1.5 font-mono tabular-nums shrink-0">
                  <span className="font-semibold">{count}</span>
                  {counts.total > 0 && (
                    <span
                      className={`text-[10px] ${
                        isActive
                          ? 'opacity-80'
                          : isEmpty
                            ? 'text-[#9DB2C7]'
                            : 'text-[#688099]'
                      }`}
                    >
                      %{pct}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Proportional Visual Distribution Strip + Active Filter Reset */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Kategorilere göre oransal dağılım çubuğu"
          data-testid="food-segment-distribution"
          className="flex-1 min-w-[180px] h-2 rounded-full bg-[#EBF2F9] overflow-hidden flex gap-0.5"
        >
          {counts.total > 0 &&
            FOOD_SEGMENTS_ORDER.map((segId) => {
              const count = counts[segId];
              if (count === 0) return null;
              const widthPct = (count / counts.total) * 100;
              const isSelected = consensusFilter === segId;
              const dimmed = consensusFilter !== 'ALL' && !isSelected;
              const meta = FOOD_SEGMENT_META[segId];
              return (
                <button
                  key={segId}
                  type="button"
                  onClick={() =>
                    onSelectConsensus(isSelected ? 'ALL' : segId)
                  }
                  aria-label={`${meta.title}: ${count} besin (%${percentages[segId]})`}
                  title={`${meta.title} · ${count} besin (%${percentages[segId]})`}
                  className={`h-full transition-opacity duration-200 cursor-pointer focus:outline-none ${
                    SEGMENT_VISUAL_STYLES[segId].barBg
                  } ${dimmed ? 'opacity-25 hover:opacity-60' : 'opacity-100 hover:opacity-90'}`}
                  style={{ width: `${widthPct}%` }}
                />
              );
            })}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#155CC0] hover:text-[#1D6FD6] whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Filtreleri Sıfırla
          </button>
        )}
      </div>
    </div>
  );
});
