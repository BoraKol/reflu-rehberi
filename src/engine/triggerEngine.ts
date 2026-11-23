import { FOOD_DATABASE } from '../data/foodDatabase';
import {
  escapeRegex,
  normalizeTurkishForMatch,
  normalizeTurkishKeepLength,
} from '../lib/turkish';
import type {
  FoodItem,
  IngredientTriggerMatch,
  LoggedFoodItem,
  LoggedSymptom,
  MechanismCode,
  SymptomCode,
} from '../types/reflux';

export { normalizeTurkishForMatch };

// ---------------------------------------------------------------------------
// Precomputed O(1) lookup tables & compiled RegExp indexes (built once at load)
// ---------------------------------------------------------------------------

const FOOD_BY_ID = new Map<string, FoodItem>();
const EXACT_TERM_MAP = new Map<string, FoodItem>();

interface CompiledTerm {
  readonly term: string;
  readonly wordBoundaryRegex: RegExp;
}

interface NormalizedFoodIndex {
  readonly item: FoodItem;
  readonly compiledTerms: readonly CompiledTerm[];
}

interface CompiledAliasCandidate {
  readonly foodId: string;
  readonly aliasNorm: string;
  readonly original: string;
  readonly regex: RegExp;
}

const NORMALIZED_INDEX: readonly NormalizedFoodIndex[] = FOOD_DATABASE.map((item) => {
  FOOD_BY_ID.set(item.id, item);

  const terms = [item.name, ...item.aliases]
    .map((t) => normalizeTurkishForMatch(t))
    .filter((t) => t.length >= 2);
  // Longest first so specific aliases match before shorter ones
  const uniqueSorted = Array.from(new Set(terms)).sort((a, b) => b.length - a.length);

  const compiledTerms: CompiledTerm[] = [];
  for (const term of uniqueSorted) {
    if (!EXACT_TERM_MAP.has(term)) {
      EXACT_TERM_MAP.set(term, item);
    }
    if (term.length >= 3) {
      compiledTerms.push({
        term,
        wordBoundaryRegex: new RegExp(`(^|\\s)${escapeRegex(term)}(\\s|$)`),
      });
    }
  }

  return { item, compiledTerms };
});

const PRECOMPUTED_ALIAS_CANDIDATES: readonly CompiledAliasCandidate[] = (() => {
  const candidates: CompiledAliasCandidate[] = [];
  for (const food of FOOD_DATABASE) {
    const rawTerms = [food.name, ...food.aliases];
    for (const original of rawTerms) {
      const aliasNorm = normalizeTurkishForMatch(original);
      if (aliasNorm.length < 3) continue;
      candidates.push({
        foodId: food.id,
        aliasNorm,
        original,
        regex: new RegExp(`(^|[^a-z0-9])${escapeRegex(aliasNorm)}([^a-z0-9]|$)`),
      });
    }
  }
  candidates.sort((a, b) => b.aliasNorm.length - a.aliasNorm.length);
  return candidates;
})();

export function getFoodById(id: string | null | undefined): FoodItem | undefined {
  if (!id) return undefined;
  return FOOD_BY_ID.get(id);
}

/**
 * Deterministically matches a raw food string against FOOD_DATABASE.
 * NEVER fabricates or guesses risk for unknown items: returns UNVERIFIED_CUSTOM.
 */
export function matchFoodItem(rawFoodName: string): LoggedFoodItem {
  const cleaned = rawFoodName.trim();
  const normalized = normalizeTurkishForMatch(cleaned);

  if (!normalized) {
    return {
      rawName: cleaned,
      matchedFoodId: null,
      status: 'UNVERIFIED_CUSTOM',
    };
  }

  // Pass 1: O(1) exact normalized match
  const exactItem = EXACT_TERM_MAP.get(normalized);
  if (exactItem) {
    return {
      rawName: cleaned,
      matchedFoodId: exactItem.id,
      matchedFoodName: exactItem.name,
      status: 'VERIFIED',
      consensusLevel: exactItem.consensusLevel,
    };
  }

  // Pass 2: Longest alias boundary/substring match (>= 3 chars; precompiled regexes)
  const inputBoundaryRegex =
    normalized.length >= 4
      ? new RegExp(`(^|\\s)${escapeRegex(normalized)}(\\s|$)`)
      : null;

  let bestMatch: { item: FoodItem; score: number } | null = null;
  for (let i = 0; i < NORMALIZED_INDEX.length; i++) {
    const entry = NORMALIZED_INDEX[i];
    for (let j = 0; j < entry.compiledTerms.length; j++) {
      const { term, wordBoundaryRegex } = entry.compiledTerms[j];
      const termInInput =
        normalized.includes(term) && wordBoundaryRegex.test(normalized);
      const inputInTerm =
        inputBoundaryRegex !== null &&
        term.includes(normalized) &&
        inputBoundaryRegex.test(term);

      if (termInInput || inputInTerm) {
        const score = termInInput ? term.length * 2 : normalized.length;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { item: entry.item, score };
        }
      }
    }
  }

  if (bestMatch) {
    return {
      rawName: cleaned,
      matchedFoodId: bestMatch.item.id,
      matchedFoodName: bestMatch.item.name,
      status: 'VERIFIED',
      consensusLevel: bestMatch.item.consensusLevel,
    };
  }

  return {
    rawName: cleaned,
    matchedFoodId: null,
    status: 'UNVERIFIED_CUSTOM',
  };
}

const SYMPTOM_OFFLINE_PATTERNS: readonly { code: SymptomCode; patterns: readonly RegExp[] }[] = [
  {
    code: 'HEARTBURN',
    patterns: [/\bmide\w*\s+yan/, /\bgogus\w*\s+yan/, /\beksime/, /\byanma\b/],
  },
  {
    code: 'REGURGITATION',
    patterns: [/\baci\s+su/, /\beksi\s+su/, /\bagz\w*\s+(aci|eksi|yemek)\s+gel/, /\bregurjit/],
  },
  {
    code: 'UPPER_ABDOMINAL_PAIN',
    patterns: [/\bmide\s+agri/, /\bust\s+karin\s+agri/, /\bmide\w*\s+sanci/],
  },
  {
    code: 'NAUSEA',
    patterns: [/\bbulanti/, /\bmide\w*\s+bulan/],
  },
  {
    code: 'NIGHT_SLEEP_DISRUPTION',
    patterns: [/\bgece\s+uyan/, /\buykudan\s+uyan/, /\buyuyamad/],
  },
  {
    code: 'HOARSENESS',
    patterns: [/\bses\s+kisik/, /\bsesim\s+kisil/, /\bses\s+catallan/],
  },
  {
    code: 'THROAT_CLEARING',
    patterns: [/\bbogaz\w*\s+temizle/, /\bohh?o\b/],
  },
  {
    code: 'EXCESS_THROAT_MUCUS',
    patterns: [/\bgeniz\s+akinti/, /\bbogaz\w*\s+(balgam|salgi)/],
  },
  {
    code: 'POST_MEAL_COUGH',
    patterns: [/\byemek\w*\s+sonra\w*\s+oksur/, /\buzaninca\s+oksur/, /\byatinca\s+oksur/],
  },
  {
    code: 'PERSISTENT_COUGH',
    patterns: [/\bkuru\s+oksur/, /\binatci\s+oksur/, /\boksuruk\b/],
  },
  {
    code: 'GLOBUS_LUMP',
    patterns: [/\bbogaz\w*\s+(yumru|dugum|bir\s+sey\s+var|takilma\s+hissi)/, /\bglobus/],
  },
  {
    code: 'THROAT_IRRITATION',
    patterns: [/\bbogaz\w*\s+(gicik|yanma|kuruluk|tahris)/, /\bgicik\b/],
  },
];

const HHMM_EXTRACT_REGEX = /\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/;
const HOUR_ONLY_EXTRACT_REGEX = /\bsaat\s+([01]?\d|2[0-3])\b/;
const MILD_SEVERITY_REGEX = /\b(hafif|az|biraz)\b/;
const HIGH_SEVERITY_REGEX = /\b(siddetli|cok|yogun|agir)\b/;

export interface OfflineParseOutput {
  foods: string[];
  timeHHMM: string | null;
  symptoms: LoggedSymptom[];
  notesSummary: string;
}

/**
 * Deterministic offline Turkish parser so users can log smoothly even without an API call.
 * Extracts verified database mentions, explicit HH:MM times, and symptom keywords.
 */
export function parseTextOfflineFallback(rawText: string): OfflineParseOutput {
  const normalized = normalizeTurkishForMatch(rawText);
  const foundFoods: string[] = [];
  const matchedIds = new Set<string>();

  let workingText = normalized;
  for (let i = 0; i < PRECOMPUTED_ALIAS_CANDIDATES.length; i++) {
    const candidate = PRECOMPUTED_ALIAS_CANDIDATES[i];
    if (matchedIds.has(candidate.foodId)) continue;
    if (workingText.includes(candidate.aliasNorm) && candidate.regex.test(workingText)) {
      matchedIds.add(candidate.foodId);
      foundFoods.push(candidate.original);
      workingText = workingText.replace(candidate.aliasNorm, ' ');
    }
  }

  let timeHHMM: string | null = null;
  const hhmmMatch = HHMM_EXTRACT_REGEX.exec(rawText);
  if (hhmmMatch) {
    timeHHMM = `${hhmmMatch[1].padStart(2, '0')}:${hhmmMatch[2]}`;
  } else {
    const hourOnlyMatch = HOUR_ONLY_EXTRACT_REGEX.exec(normalized);
    if (hourOnlyMatch) {
      timeHHMM = `${hourOnlyMatch[1].padStart(2, '0')}:00`;
    }
  }

  let defaultSeverity = 3;
  if (MILD_SEVERITY_REGEX.test(normalized)) defaultSeverity = 2;
  if (HIGH_SEVERITY_REGEX.test(normalized)) defaultSeverity = 4;

  const symptoms: LoggedSymptom[] = [];
  const seenSymptoms = new Set<SymptomCode>();

  for (let i = 0; i < SYMPTOM_OFFLINE_PATTERNS.length; i++) {
    const entry = SYMPTOM_OFFLINE_PATTERNS[i];
    if (seenSymptoms.has(entry.code)) continue;
    if (entry.patterns.some((p) => p.test(normalized))) {
      if (entry.code === 'PERSISTENT_COUGH' && seenSymptoms.has('POST_MEAL_COUGH')) {
        continue;
      }
      seenSymptoms.add(entry.code);
      symptoms.push({ code: entry.code, severity: defaultSeverity });
    }
  }

  return {
    foods: foundFoods,
    timeHHMM,
    symptoms,
    notesSummary: 'Çevrimdışı yerel eşleştirme ile ayrıştırıldı',
  };
}

// --- OPEN FOOD FACTS DETERMINISTIC INGREDIENT SCANNER ---

interface CompiledIngredientRule {
  readonly id: string;
  readonly label: string;
  readonly mechanism: MechanismCode;
  readonly reason: string;
  readonly compiledTerms: readonly { term: string; regex: RegExp }[];
}

const RAW_INGREDIENT_RULES: ReadonlyArray<{
  id: string;
  label: string;
  mechanism: MechanismCode;
  reason: string;
  terms: readonly string[];
}> = [
  {
    id: 'citric-acid',
    label: 'Sitrik Asit / Asitlik Düzenleyici (E330)',
    mechanism: 'ACIDIC_PEPSIN_TRIGGER',
    reason: 'Yüksek asitlik ekler; özellikle sessiz reflüde (LPR) boğazdaki pepsin enzimini aktive edebilir.',
    terms: ['sitrik asit', 'citric acid', 'e330', 'e 330', 'fosforik asit', 'phosphoric acid', 'e338', 'malik asit', 'askorbik asit'],
  },
  {
    id: 'tomato-paste',
    label: 'Domates / Domates Salçası / Püresi',
    mechanism: 'ACIDIC_PEPSIN_TRIGGER',
    reason: 'Doğal organik asit yoğunluğu yüksek domates bileşeni içerir.',
    terms: ['domates salcasi', 'domates puresi', 'domates tozu', 'domates konsantresi', 'tomato paste', 'tomato puree', 'domates'],
  },
  {
    id: 'caffeine',
    label: 'Kafein / Kahve / Çay Ekstraktı',
    mechanism: 'LES_RELAXANT',
    reason: 'Kafein alt yemek borusu kapağını (LES) gevşetebilir.',
    terms: ['kafein', 'caffeine', 'kahve ekstrakti', 'cozunebilir kahve', 'siyah cay ekstrakti', 'guarana'],
  },
  {
    id: 'cocoa-chocolate',
    label: 'Kakao / Çikolata',
    mechanism: 'LES_RELAXANT',
    reason: 'Kakao metilksantinleri (teobromin) ve kakao yağı LES kapağını gevşetebilir.',
    terms: ['kakao', 'cocoa', 'cikolata', 'chocolate', 'kakao yagi', 'kakao kitlesi'],
  },
  {
    id: 'mint-menthol',
    label: 'Nane / Mentol',
    mechanism: 'LES_RELAXANT',
    reason: 'Nane ve mentol alt yemek borusu kapağını doğrudan gevşetebilir.',
    terms: ['nane', 'mentol', 'menthol', 'peppermint', 'spearmint', 'nane aromasi', 'nane yagi'],
  },
  {
    id: 'hot-pepper',
    label: 'Acı Biber / Pul Biber / Kapsaisin',
    mechanism: 'MUCOSAL_IRRITANT',
    reason: 'Kapsaisin yemek borusu ve boğaz mukozasını doğrudan uyarabilir.',
    terms: ['aci biber', 'pul biber', 'kirmizi biber ekstrakti', 'kapsaisin', 'chili', 'chilli', 'cayenne', 'jalapeno', 'isot', 'aci toz biber'],
  },
  {
    id: 'vinegar',
    label: 'Sirke / Asetik Asit',
    mechanism: 'ACIDIC_PEPSIN_TRIGGER',
    reason: 'Yüksek asitli sirke içeriği yemek borusu ve boğaz mukozasını zorlayabilir.',
    terms: ['sirke', 'vinegar', 'asetik asit', 'acetic acid', 'e260', 'nar eksisi'],
  },
  {
    id: 'onion-garlic',
    label: 'Soğan / Sarımsak Tozu',
    mechanism: 'MUCOSAL_IRRITANT',
    reason: 'Aromatik soğan ve sarımsak konsantreleri hassas bireylerde reflüyü tetikleyebilir.',
    terms: ['sogan tozu', 'sarimsak tozu', 'onion powder', 'garlic powder', 'kurutulmus sogan', 'kurutulmus sarimsak', 'sogan ekstrakti'],
  },
  {
    id: 'carbonation',
    label: 'Karbondioksit / Gazlı Yapı',
    mechanism: 'CARBONATED_PRESSURE',
    reason: 'Karbondioksit midede gaz basıncı ve geğirme refleksini artırabilir.',
    terms: ['karbondioksit', 'karbon dioksit', 'carbon dioxide', 'e290', 'gazli su', 'carbonated water'],
  },
];

const COMPILED_INGREDIENT_RULES: readonly CompiledIngredientRule[] = RAW_INGREDIENT_RULES.map(
  (rule) => ({
    id: rule.id,
    label: rule.label,
    mechanism: rule.mechanism,
    reason: rule.reason,
    compiledTerms: rule.terms.map((term) => ({
      term,
      regex: new RegExp(`(^|[^a-z0-9])(${escapeRegex(term)})([^a-z0-9]|$)`),
    })),
  })
);

export const HIGH_FAT_THRESHOLD_G_PER_100G = 17.5;

function extractSnippet(originalText: string, matchStart: number, matchLength: number): string {
  const radius = 34;
  const start = Math.max(0, matchStart - radius);
  const end = Math.min(originalText.length, matchStart + matchLength + radius);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < originalText.length ? '…' : '';
  return `${prefix}${originalText.slice(start, end).trim()}${suffix}`;
}

export function scanIngredientsForTriggers(
  ingredientsText: string | null | undefined,
  fat100g: number | null | undefined
): { triggers: IngredientTriggerMatch[]; highFatFlag: boolean } {
  const triggers: IngredientTriggerMatch[] = [];
  const raw = (ingredientsText ?? '').trim();

  if (raw.length > 0) {
    const norm = normalizeTurkishKeepLength(raw);

    for (let r = 0; r < COMPILED_INGREDIENT_RULES.length; r++) {
      const rule = COMPILED_INGREDIENT_RULES[r];
      for (let t = 0; t < rule.compiledTerms.length; t++) {
        const { term, regex } = rule.compiledTerms[t];
        if (!norm.includes(term)) continue;
        const match = regex.exec(norm);
        if (match) {
          const offset = match.index + match[1].length;
          const matchedOriginal = raw.slice(offset, offset + match[2].length);
          triggers.push({
            triggerId: rule.id,
            label: rule.label,
            mechanism: rule.mechanism,
            matchedTerm: matchedOriginal,
            snippet: extractSnippet(raw, offset, match[2].length),
            reason: rule.reason,
          });
          break;
        }
      }
    }
  }

  const numericFat = typeof fat100g === 'number' && Number.isFinite(fat100g) ? fat100g : null;
  const highFatFlag = numericFat !== null && numericFat > HIGH_FAT_THRESHOLD_G_PER_100G;

  if (highFatFlag && numericFat !== null) {
    triggers.push({
      triggerId: 'high-fat-100g',
      label: `Yüksek Yağ İçeriği (${numericFat.toFixed(1)} g / 100 g)`,
      mechanism: 'HIGH_FAT_SLOW_EMPTYING',
      matchedTerm: `${numericFat.toFixed(1)}g yağ`,
      snippet: `100 g üründe ${numericFat.toFixed(1)} g yağ (> ${HIGH_FAT_THRESHOLD_G_PER_100G} g yüksek yağ eşiği)`,
      reason: 'Yüksek yağ oranı mide boşalmasını geciktirerek reflü riskini artırabilir.',
    });
  }

  return { triggers, highFatFlag };
}
