import { normalizeTurkishForMatch } from '../lib/turkish';
import type { ConsensusLevel, FoodItem, MechanismCode } from '../types/reflux';

export const FOOD_SEGMENTS_ORDER: readonly ConsensusLevel[] = [
  'generally_tolerated',
  'individual_varies',
  'common_trigger',
] as const;

export interface FoodSegmentMeta {
  id: ConsensusLevel;
  title: string;
  shortTitle: string;
  subtitle: string;
}

export const FOOD_SEGMENT_META: Record<ConsensusLevel, FoodSegmentMeta> = {
  generally_tolerated: {
    id: 'generally_tolerated',
    title: 'Genelde İyi Tolere Edilen',
    shortTitle: 'İyi Tolere Edilen',
    subtitle: 'Çoğu kişi tarafından genellikle daha rahat tolere edilen besinler',
  },
  individual_varies: {
    id: 'individual_varies',
    title: 'Kişiye Göre Değişen',
    shortTitle: 'Kişiye Göre Değişen',
    subtitle: 'Porsiyon, hazırlanış ve saate göre etkisi kişiden kişiye değişebilenler',
  },
  common_trigger: {
    id: 'common_trigger',
    title: 'Yaygın Tetikleyici',
    shortTitle: 'Yaygın Tetikleyici',
    subtitle: 'Gözlemlerde sıkça rahatsızlıkla ilişkilendirilen besinler',
  },
};

export interface FoodSegmentGroup {
  id: ConsensusLevel;
  title: string;
  subtitle: string;
  items: FoodItem[];
  count: number;
}

export interface FoodSegmentCounts {
  total: number;
  generally_tolerated: number;
  individual_varies: number;
  common_trigger: number;
}

export interface FoodFilterParams {
  searchQuery: string;
  consensusFilter: 'ALL' | ConsensusLevel;
  mechanismFilter: 'ALL' | MechanismCode;
}

export interface FoodSegmentPercentages {
  generally_tolerated: number;
  individual_varies: number;
  common_trigger: number;
}

export interface SegmentedFoodResult {
  counts: FoodSegmentCounts;
  percentages: FoodSegmentPercentages;
  segments: FoodSegmentGroup[];
  flatItems: FoodItem[];
}

/**
 * WeakMap cache for normalized food search haystacks: avoids re-normalizing
 * every food item's name, aliases and category on each search keystroke,
 * while remaining garbage-collectible if transient FoodItem arrays are passed.
 */
const HAYSTACK_CACHE = new WeakMap<FoodItem, string>();

function getNormalizedHaystack(item: FoodItem): string {
  let cached = HAYSTACK_CACHE.get(item);
  if (cached === undefined) {
    cached = normalizeTurkishForMatch(
      `${item.name} ${item.aliases.join(' ')} ${item.category}`
    );
    HAYSTACK_CACHE.set(item, cached);
  }
  return cached;
}

function computeSegmentPercentages(counts: FoodSegmentCounts): FoodSegmentPercentages {
  if (counts.total <= 0) {
    return { generally_tolerated: 0, individual_varies: 0, common_trigger: 0 };
  }

  const raw = FOOD_SEGMENTS_ORDER.map((id) => {
    const exact = (counts[id] / counts.total) * 100;
    const floored = Math.floor(exact);
    return { id, floored, remainder: exact - floored };
  });

  let remaining = 100 - raw.reduce((acc, item) => acc + item.floored, 0);
  const byRemainder = [...raw].sort((a, b) => b.remainder - a.remainder);
  const result: FoodSegmentPercentages = {
    generally_tolerated: 0,
    individual_varies: 0,
    common_trigger: 0,
  };

  for (const item of raw) {
    result[item.id] = item.floored;
  }
  for (let i = 0; i < byRemainder.length && remaining > 0; i++) {
    if (counts[byRemainder[i].id] > 0) {
      result[byRemainder[i].id] += 1;
      remaining -= 1;
    }
  }

  return result;
}

/**
 * Pure single-pass O(N) filter & automatic category segmentation for the verified
 * food catalog. Counts and percentages per segment reflect search + mechanism
 * filters before applying the selected consensus tab so users can jump between
 * segments cleanly.
 */
export function segmentAndFilterFoods(
  foods: readonly FoodItem[],
  params: FoodFilterParams
): SegmentedFoodResult {
  const normQuery = normalizeTurkishForMatch(params.searchQuery);
  const buckets: Record<ConsensusLevel, FoodItem[]> = {
    generally_tolerated: [],
    individual_varies: [],
    common_trigger: [],
  };

  for (let i = 0; i < foods.length; i++) {
    const item = foods[i];

    if (
      params.mechanismFilter !== 'ALL' &&
      !item.mechanisms.includes(params.mechanismFilter)
    ) {
      continue;
    }

    if (normQuery && !getNormalizedHaystack(item).includes(normQuery)) {
      continue;
    }

    buckets[item.consensusLevel].push(item);
  }

  const counts: FoodSegmentCounts = {
    generally_tolerated: buckets.generally_tolerated.length,
    individual_varies: buckets.individual_varies.length,
    common_trigger: buckets.common_trigger.length,
    total:
      buckets.generally_tolerated.length +
      buckets.individual_varies.length +
      buckets.common_trigger.length,
  };

  const percentages = computeSegmentPercentages(counts);
  const segments: FoodSegmentGroup[] = [];
  const flatItems: FoodItem[] = [];

  for (let i = 0; i < FOOD_SEGMENTS_ORDER.length; i++) {
    const segId = FOOD_SEGMENTS_ORDER[i];
    if (params.consensusFilter !== 'ALL' && params.consensusFilter !== segId) {
      continue;
    }
    const items = buckets[segId];
    if (items.length === 0) continue;

    const meta = FOOD_SEGMENT_META[segId];
    segments.push({
      id: segId,
      title: meta.title,
      subtitle: meta.subtitle,
      items,
      count: items.length,
    });
    for (let j = 0; j < items.length; j++) {
      flatItems.push(items[j]);
    }
  }

  return { counts, percentages, segments, flatItems };
}
