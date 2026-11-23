export type AcidCategory =
  | 'HIGH_ACID_PEPSIN_RISK'
  | 'MODERATE_ACID'
  | 'LOW_ACID_ALKALINE';

export type MechanismCode =
  | 'ACIDIC_PEPSIN_TRIGGER'
  | 'LES_RELAXANT'
  | 'HIGH_FAT_SLOW_EMPTYING'
  | 'MUCOSAL_IRRITANT'
  | 'CARBONATED_PRESSURE'
  | 'GENERALLY_WELL_TOLERATED';

export type ConsensusLevel =
  | 'common_trigger'
  | 'individual_varies'
  | 'generally_tolerated';

export type EvidenceBasis =
  | 'ACG Kılavuzu / Genel Klinik Uzlaşı'
  | 'LPR Düşük Asit Protokolü'
  | 'Fizyolojik Mekanizma';

export interface FoodItem {
  id: string;
  name: string;
  aliases: string[];
  category:
    | 'İçecek'
    | 'Ana Yemek & Hamur İşi'
    | 'Sebze & Meyve'
    | 'Sos & Baharat'
    | 'Süt & Kahvaltılık'
    | 'Atıştırmalık & Tatlı';
  acidCategory: AcidCategory;
  consensusLevel: ConsensusLevel;
  mechanisms: MechanismCode[];
  whyItMatters: string;
  lprSpecificNote?: string;
  evidenceBasis: EvidenceBasis;
  personalReminder: string;
}

export type SymptomCode =
  | 'HEARTBURN'
  | 'REGURGITATION'
  | 'UPPER_ABDOMINAL_PAIN'
  | 'NAUSEA'
  | 'NIGHT_SLEEP_DISRUPTION'
  | 'HOARSENESS'
  | 'THROAT_CLEARING'
  | 'EXCESS_THROAT_MUCUS'
  | 'POST_MEAL_COUGH'
  | 'PERSISTENT_COUGH'
  | 'GLOBUS_LUMP'
  | 'THROAT_IRRITATION';

export interface SymptomMeta {
  code: SymptomCode;
  label: string;
  shortLabel: string;
  axis: 'GERD' | 'LPR';
}

export const SYMPTOM_CATALOG: Record<SymptomCode, SymptomMeta> = {
  HEARTBURN: {
    code: 'HEARTBURN',
    label: 'Göğüste yanma (mide yanması)',
    shortLabel: 'Mide Yanması',
    axis: 'GERD',
  },
  REGURGITATION: {
    code: 'REGURGITATION',
    label: 'Ağza acı/ekşi su veya yemek gelmesi',
    shortLabel: 'Ağza Acı Su',
    axis: 'GERD',
  },
  UPPER_ABDOMINAL_PAIN: {
    code: 'UPPER_ABDOMINAL_PAIN',
    label: 'Üst karın ortasında ağrı veya yanma',
    shortLabel: 'Üst Karın Ağrısı',
    axis: 'GERD',
  },
  NAUSEA: {
    code: 'NAUSEA',
    label: 'Mide bulantısı',
    shortLabel: 'Bulantı',
    axis: 'GERD',
  },
  NIGHT_SLEEP_DISRUPTION: {
    code: 'NIGHT_SLEEP_DISRUPTION',
    label: 'Reflü nedeniyle uykudan uyanma / uyumakta zorlanma',
    shortLabel: 'Gece Uyanması',
    axis: 'GERD',
  },
  HOARSENESS: {
    code: 'HOARSENESS',
    label: 'Ses kısıklığı veya seste yorgunluk',
    shortLabel: 'Ses Kısıklığı',
    axis: 'LPR',
  },
  THROAT_CLEARING: {
    code: 'THROAT_CLEARING',
    label: 'Sık boğaz temizleme ihtiyacı',
    shortLabel: 'Boğaz Temizleme',
    axis: 'LPR',
  },
  EXCESS_THROAT_MUCUS: {
    code: 'EXCESS_THROAT_MUCUS',
    label: 'Geniz akıntısı veya aşırı boğaz salgısı',
    shortLabel: 'Geniz Akıntısı',
    axis: 'LPR',
  },
  POST_MEAL_COUGH: {
    code: 'POST_MEAL_COUGH',
    label: 'Yemek sonrası veya uzanınca öksürük',
    shortLabel: 'Yemek Sonrası Öksürük',
    axis: 'LPR',
  },
  PERSISTENT_COUGH: {
    code: 'PERSISTENT_COUGH',
    label: 'İnatçı kuru öksürük',
    shortLabel: 'Kuru Öksürük',
    axis: 'LPR',
  },
  GLOBUS_LUMP: {
    code: 'GLOBUS_LUMP',
    label: 'Boğazda yumru veya takılma hissi (globus)',
    shortLabel: 'Boğazda Yumru',
    axis: 'LPR',
  },
  THROAT_IRRITATION: {
    code: 'THROAT_IRRITATION',
    label: 'Boğazda gıcık, yanma veya kuruluk',
    shortLabel: 'Boğazda Gıcık',
    axis: 'LPR',
  },
};

export interface LoggedFoodItem {
  rawName: string;
  matchedFoodId: string | null;
  matchedFoodName?: string;
  status: 'VERIFIED' | 'UNVERIFIED_CUSTOM';
  consensusLevel?: ConsensusLevel;
}

export interface LoggedSymptom {
  code: SymptomCode;
  severity: number; // 1..5
}

export type RedFlagUrgency = 'NONE' | 'URGENT_EVALUATION' | 'EMERGENCY';

export interface RedFlagSignal {
  id: string;
  label: string;
  matchedPhrase: string;
  urgency: 'URGENT_EVALUATION' | 'EMERGENCY';
}

export interface RedFlagDetectionResult {
  hasRedFlag: boolean;
  urgency: RedFlagUrgency;
  signals: RedFlagSignal[];
  headline: string;
  guidance: string;
}

export interface RefluxLogEntry {
  id: string;
  timestamp: string; // ISO
  dateStr: string; // YYYY-MM-DD
  timeHHMM: string; // HH:MM
  rawText: string;
  foods: LoggedFoodItem[];
  symptoms: LoggedSymptom[];
  bedtimeHHMM?: string;
  mealToSleepMinutes?: number;
  isLateMeal?: boolean;
  redFlag?: RedFlagDetectionResult;
  source: 'gemini' | 'manual' | 'demo';
  notesSummary?: string;
}

export interface AssessmentRecord {
  id: string;
  timestamp: string;
  dateStr: string;
  rsiAnswers: number[]; // length 9, 0..5
  rsiTotal: number;
  rsiSwallowingScore: number;
  gerdqAnswers: number[]; // length 6, index 0..3 ('0 gün', '1 gün', '2-3 gün', '4-7 gün')
  gerdqBurdenScore: number; // 0..18
  gerdqHeartburnFreqIndex: number; // 0..3
  gerdqRegurgFreqIndex: number; // 0..3
  profileType: 'LPR_DOMINANT' | 'GERD_DOMINANT' | 'MIXED' | 'LOW_SYMPTOM';
}

export interface SleepShieldState {
  lastMealTimestamp: number | null;
  windowHours: 3 | 4;
}

export interface KnowledgeCard {
  id: string;
  category: 'Sessiz Reflü' | 'Beslenme Mekaniği' | 'Uyku & Duruş' | 'Doktora Ne Zaman?';
  title: string;
  isRedFlagCard?: boolean;
  shortSummary: string;
  dailyApplication: string;
  references: string[];
}

export interface IngredientTriggerMatch {
  triggerId: string;
  label: string;
  mechanism: MechanismCode;
  matchedTerm: string;
  snippet: string;
  reason: string;
}

export interface OpenFoodFactsProduct {
  code: string;
  productName: string;
  brands: string;
  ingredientsText: string | null;
  fat100g: number | null;
  imageUrl: string | null;
  triggers: IngredientTriggerMatch[];
  highFatFlag: boolean;
  ingredientsMissing: boolean;
}

export interface PersonalPatternOccurrence {
  dateStr: string;
  timeHHMM: string;
  rawText: string;
  hadSymptom: boolean;
  symptomSummary: string;
}

export interface PersonalPattern {
  id: string;
  key: string;
  label: string;
  kind: 'FOOD' | 'LATE_MEAL' | 'SHORT_SLEEP_GAP';
  totalOccurrences: number;
  symptomOccurrences: number;
  ratioPercent: number;
  meetsMinSample: boolean; // >= 3
  minSampleRequired: number;
  summaryText: string;
  occurrences: PersonalPatternOccurrence[];
}

export interface SleepGapComparison {
  shortGapCount: number; // < 180 min
  shortGapAvgSeverity: number | null;
  shortGapSymptomRate: number | null;
  safeGapCount: number; // >= 180 min
  safeGapAvgSeverity: number | null;
  safeGapSymptomRate: number | null;
  avgMealToSleepMinutes: number | null;
}

export interface DailyTrendPoint {
  dateStr: string;
  label: string;
  gerdScore: number;
  lprScore: number;
  logCount: number;
}

export type ActiveTab =
  | 'dashboard'
  | 'logger'
  | 'assessment'
  | 'foods'
  | 'detective'
  | 'knowledge'
  | 'report';

export interface AppPersistedState {
  logs: RefluxLogEntry[];
  assessments: AssessmentRecord[];
  sleepShield: SleepShieldState;
  isDemoLoaded: boolean;
}
