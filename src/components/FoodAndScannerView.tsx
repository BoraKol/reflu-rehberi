import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  PackageSearch,
  Search,
} from 'lucide-react';
import {
  ACID_CATEGORY_LABELS,
  FOOD_DATABASE,
  MECHANISM_LABELS,
} from '../data/foodDatabase';
import { getFoodPersonalHistory } from '../engine/correlationEngine';
import { segmentAndFilterFoods } from '../engine/foodSegments';
import type {
  ConsensusLevel,
  FoodItem,
  MechanismCode,
  RefluxLogEntry,
} from '../types/reflux';
import { FoodIcon } from './FoodIcon';
import {
  FoodSegmentFilterBar,
  SEGMENT_VISUAL_STYLES,
} from './FoodSegmentFilterBar';
import { ConsensusBadge } from './SemanticBadges';
import { PackagedProductScanner } from './foods/PackagedProductScanner';
import { PageHeader } from './ui/PageHeader';

interface FoodAndScannerViewProps {
  logs: RefluxLogEntry[];
}

const MECHANISM_CODES = Object.keys(MECHANISM_LABELS) as MechanismCode[];

export const FoodAndScannerView = memo(function FoodAndScannerView({
  logs,
}: FoodAndScannerViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'guide' | 'scanner'>('guide');

  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [consensusFilter, setConsensusFilter] = useState<'ALL' | ConsensusLevel>('ALL');
  const [mechanismFilter, setMechanismFilter] = useState<'ALL' | MechanismCode>('ALL');
  const [collapsedSegments, setCollapsedSegments] = useState<
    Partial<Record<ConsensusLevel, boolean>>
  >({});
  const [selectedFoodId, setSelectedFoodId] = useState<string>('');

  const segmented = useMemo(
    () =>
      segmentAndFilterFoods(FOOD_DATABASE, {
        searchQuery: deferredSearchQuery,
        consensusFilter,
        mechanismFilter,
      }),
    [deferredSearchQuery, consensusFilter, mechanismFilter]
  );

  const filteredFoods = segmented.flatItems;

  const selectedFood: FoodItem | null = useMemo(
    () => filteredFoods.find((f) => f.id === selectedFoodId) ?? filteredFoods[0] ?? null,
    [filteredFoods, selectedFoodId]
  );

  const selectedFoodHistory = useMemo(
    () => (selectedFood ? getFoodPersonalHistory(logs, selectedFood.id, true) : null),
    [logs, selectedFood]
  );

  const handleSelectConsensus = useCallback((next: 'ALL' | ConsensusLevel) => {
    setConsensusFilter(next);
    if (next !== 'ALL') {
      setCollapsedSegments((prev) => ({ ...prev, [next]: false }));
    }
  }, []);

  const handleToggleSegmentCollapse = useCallback((segId: ConsensusLevel) => {
    setCollapsedSegments((prev) => ({ ...prev, [segId]: !prev[segId] }));
  }, []);

  const allVisibleSegmentsCollapsed =
    segmented.segments.length > 0 &&
    segmented.segments.every((seg) => Boolean(collapsedSegments[seg.id]));

  const handleToggleAllSegments = useCallback(() => {
    if (allVisibleSegmentsCollapsed) {
      setCollapsedSegments({});
      return;
    }
    const next: Partial<Record<ConsensusLevel, boolean>> = {};
    for (const seg of segmented.segments) {
      next[seg.id] = true;
    }
    setCollapsedSegments(next);
  }, [allVisibleSegmentsCollapsed, segmented.segments]);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setConsensusFilter('ALL');
    setMechanismFilter('ALL');
    setCollapsedSegments({});
  }, []);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    consensusFilter !== 'ALL' ||
    mechanismFilter !== 'ALL';

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Besin Rehberi ve Paketli Ürün Etiket Kontrolü"
        title="Besin & Paketli Ürün Kontrolü"
        actions={
          <div
            role="tablist"
            aria-label="Besin kontrol modları"
            className="flex flex-wrap items-center gap-1 p-1 bg-[#EBF4FF] border border-[#DCE7F3] rounded-lg max-w-full"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeSubTab === 'guide'}
              onClick={() => setActiveSubTab('guide')}
              className={`inline-flex items-center gap-1.5 min-h-9 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer ${
                activeSubTab === 'guide'
                  ? 'bg-white text-[#155CC0] shadow-xs'
                  : 'text-[#455D75] hover:text-[#0F233A]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
              Doğrulanmış Besin Rehberi ({FOOD_DATABASE.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeSubTab === 'scanner'}
              onClick={() => setActiveSubTab('scanner')}
              className={`inline-flex items-center gap-1.5 min-h-9 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer ${
                activeSubTab === 'scanner'
                  ? 'bg-white text-[#155CC0] shadow-xs'
                  : 'text-[#455D75] hover:text-[#0F233A]'
              }`}
            >
              <PackageSearch className="w-3.5 h-3.5" aria-hidden="true" />
              Paketli Ürün Kontrolü
            </button>
          </div>
        }
      />

      {activeSubTab === 'guide' && (
        <div className="space-y-5">
          {/* Search & Filters */}
          <div className="bg-white border border-[#DCE7F3] rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search
                  className="w-4 h-4 text-[#688099] absolute left-3.5 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  maxLength={120}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Türkçe besin ara (örn: domates salçası, çiğ köfte, nane, yulaf)..."
                  aria-label="Doğrulanmış besin rehberinde ara"
                  className="w-full min-h-11 pl-10 pr-4 py-2.5 rounded-lg border border-[#C6D9ED] text-base sm:text-sm text-[#0F233A] placeholder:text-[#8BA0B5] focus:outline-none focus:border-[#1D6FD6]"
                />
              </div>

              <select
                aria-label="Fizyolojik mekanizmaya göre filtrele"
                value={mechanismFilter}
                onChange={(e) =>
                  setMechanismFilter(e.target.value as 'ALL' | MechanismCode)
                }
                className="min-h-11 pl-3.5 pr-8 py-2.5 rounded-lg border border-[#C6D9ED] bg-white text-base sm:text-xs font-medium text-[#0F233A] cursor-pointer"
              >
                <option value="ALL">Tüm Fizyolojik Mekanizmalar</option>
                {MECHANISM_CODES.map((code) => (
                  <option key={code} value={code}>
                    {MECHANISM_LABELS[code].label}
                  </option>
                ))}
              </select>
            </div>

            <FoodSegmentFilterBar
              consensusFilter={consensusFilter}
              counts={segmented.counts}
              percentages={segmented.percentages}
              hasActiveFilters={hasActiveFilters}
              onSelectConsensus={handleSelectConsensus}
              onResetFilters={handleResetFilters}
            />
          </div>

          {/* 2-Column Split: Auto-Segmented List + Detail Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
            <div
              data-testid="food-segmented-list"
              className="lg:col-span-6 bg-white border border-[#DCE7F3] rounded-2xl overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[#E6EFF8] flex items-center justify-between gap-2 text-xs text-[#688099] bg-[#F7FBFF]">
                <span className="font-mono tabular-nums">
                  <strong className="text-[#0F233A]">{filteredFoods.length}</strong> besin ·{' '}
                  {segmented.segments.length} segment
                </span>
                {segmented.segments.length > 1 ? (
                  <button
                    type="button"
                    onClick={handleToggleAllSegments}
                    className="text-xs font-medium text-[#155CC0] hover:text-[#1D6FD6] cursor-pointer"
                  >
                    {allVisibleSegmentsCollapsed ? 'Tümünü Aç' : 'Tümünü Daralt'}
                  </button>
                ) : (
                  <span>Otomatik kategorize edildi</span>
                )}
              </div>

              {segmented.segments.length === 0 ? (
                <div className="p-6 sm:p-8 text-center space-y-3">
                  <p className="text-sm font-medium text-[#0F233A]">
                    Seçili filtrelerle eşleşen doğrulanmış besin bulunamadı.
                  </p>
                  <p className="text-xs text-[#455D75]">
                    Listede olmayan besinler için tahmin üretilmez; Hızlı Kayıt bölümünden kişisel gözlem olarak ekleyebilir veya Paketli Ürün Kontrolü sekmesinden içindekiler etiketini tarayabilirsiniz.
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="inline-flex items-center gap-1.5 min-h-9 px-3.5 py-2 rounded-lg bg-[#EBF4FF] text-[#155CC0] hover:bg-[#DCEBFE] text-xs font-medium cursor-pointer"
                    >
                      Tüm Segmentleri Göster
                    </button>
                  )}
                </div>
              ) : (
                <div className="max-h-[460px] lg:max-h-[580px] overflow-y-auto divide-y divide-[#DCE7F3]">
                  {segmented.segments.map((segment) => {
                    const style = SEGMENT_VISUAL_STYLES[segment.id];
                    const SegIcon = style.icon;
                    const isCollapsed = Boolean(collapsedSegments[segment.id]);

                    return (
                      <div key={segment.id} data-segment-group={segment.id}>
                        <button
                          type="button"
                          onClick={() => handleToggleSegmentCollapse(segment.id)}
                          aria-expanded={!isCollapsed}
                          className={`sticky top-0 z-10 w-full px-4 py-2.5 border-b flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${style.headerBg}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <SegIcon
                              className={`w-4 h-4 shrink-0 ${style.headerText}`}
                              aria-hidden="true"
                            />
                            <div className="min-w-0">
                              <p className={`text-xs font-semibold truncate ${style.headerText}`}>
                                {segment.title}
                              </p>
                              <p className="text-[11px] text-[#455D75] truncate">
                                {segment.subtitle}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`font-mono tabular-nums text-xs font-semibold ${style.headerText}`}
                            >
                              {segment.count} besin
                            </span>
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4 text-[#455D75]" aria-hidden="true" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-[#455D75]" aria-hidden="true" />
                            )}
                          </div>
                        </button>

                        {!isCollapsed && (
                          <ul className="divide-y divide-[#E6EFF8]">
                            {segment.items.map((item) => {
                              const isSelected = selectedFood?.id === item.id;
                              return (
                                <li key={item.id}>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedFoodId(item.id)}
                                    aria-pressed={isSelected}
                                    className={`w-full text-left px-3.5 sm:px-4 py-3 flex items-center justify-between gap-2.5 sm:gap-3 transition-colors cursor-pointer ${
                                      isSelected ? 'bg-[#EBF4FF]' : 'hover:bg-[#F7FBFF]'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <FoodIcon food={item} selected={isSelected} size="sm" />
                                      <div className="min-w-0">
                                        <p
                                          className={`text-sm font-medium truncate ${
                                            isSelected ? 'text-[#155CC0]' : 'text-[#0F233A]'
                                          }`}
                                        >
                                          {item.name}
                                        </p>
                                        <p className="text-xs text-[#688099] truncate mt-0.5">
                                          {item.category} ·{' '}
                                          {item.mechanisms
                                            .map((m) => MECHANISM_LABELS[m].label)
                                            .join(' / ')}
                                        </p>
                                      </div>
                                    </div>
                                    <span className="shrink-0 hidden xs:inline-flex sm:inline-flex">
                                      <ConsensusBadge
                                        status="VERIFIED"
                                        consensusLevel={item.consensusLevel}
                                      />
                                    </span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Detail Panel */}
            <div className="lg:col-span-6 bg-white border border-[#DCE7F3] rounded-2xl p-4 sm:p-6 space-y-5 lg:sticky lg:top-20">
              {selectedFood ? (
                <>
                  <div className="space-y-2.5 pb-4 border-b border-[#E6EFF8]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-[#688099]">
                        {selectedFood.category} · {ACID_CATEGORY_LABELS[selectedFood.acidCategory]}
                      </span>
                      <ConsensusBadge
                        status="VERIFIED"
                        consensusLevel={selectedFood.consensusLevel}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <FoodIcon food={selectedFood} size="md" />
                      <h2 className="text-xl font-semibold text-[#0F233A] break-words">
                        {selectedFood.name}
                      </h2>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-[#155CC0]">
                      Genel Bilgilendirme (Mekanizma Odaklı · Tıbbi tavsiye değildir)
                    </h3>
                    <p className="text-sm text-[#0F233A] leading-relaxed">
                      {selectedFood.whyItMatters}
                    </p>

                    <div className="space-y-2 pt-1">
                      {selectedFood.mechanisms.map((m) => (
                        <div
                          key={m}
                          className="p-3.5 rounded-xl bg-[#F7FBFF] border border-[#E2EEF9]"
                        >
                          <p className="text-xs font-semibold text-[#0F233A]">
                            {MECHANISM_LABELS[m].label}
                          </p>
                          <p className="text-xs text-[#455D75] mt-0.5 leading-relaxed">
                            {MECHANISM_LABELS[m].description}
                          </p>
                        </div>
                      ))}
                    </div>

                    {selectedFood.lprSpecificNote && (
                      <div className="p-3.5 rounded-xl bg-[#FFFBEB] text-[#92400E] space-y-1">
                        <p className="text-xs font-semibold">Sessiz Reflü (LPR) Özel Notu</p>
                        <p className="text-xs leading-relaxed">
                          {selectedFood.lprSpecificNote}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-[#E6EFF8] space-y-2">
                    <h3 className="text-xs font-semibold text-[#0F233A]">
                      Senin Kayıtlarındaki Durumu
                    </h3>
                    <p className="text-sm font-medium text-[#0F233A] tabular-nums">
                      {selectedFoodHistory?.label}
                    </p>
                    <p className="text-xs text-[#455D75] leading-relaxed">
                      {selectedFood.personalReminder}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-[#688099]">
                  Detaylarını incelemek için soldaki listeden bir besin seçin.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'scanner' && <PackagedProductScanner />}
    </div>
  );
});
