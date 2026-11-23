import {
  normalizeTurkishForMatch,
  normalizeTurkishKeepLength,
} from '../lib/turkish';
import type { RedFlagDetectionResult, RedFlagSignal } from '../types/reflux';

export { normalizeTurkishForMatch };

interface RedFlagRule {
  readonly id: string;
  readonly label: string;
  readonly urgency: 'EMERGENCY' | 'URGENT_EVALUATION';
  readonly patterns: readonly RegExp[];
}

const RED_FLAG_RULES: readonly RedFlagRule[] = [
  {
    id: 'chest-pain-cardiac',
    label: 'Şiddetli / baskı tarzı göğüs ağrısı veya yayılımlı ağrı',
    urgency: 'EMERGENCY',
    patterns: [
      /\b(siddetli|baski|sikisma|ezici|batma)\w*\s+(tarzi\s+)?gogus\s+agri\w*/,
      /\bgogus\w*\s+(siddetli|baski|sikisma|ezici)\w*/,
      /\b(kol\w*|cene\w*|sirt\w*|omuz\w*)\s+(yayil\w*|vuran)\s+(gogus\s+)?agri\w*/,
      /\bgogus\s+agri\w*.*\b(kol\w*|cene\w*|sol kol\w*|sirt\w*)/,
      /\bkalp\s+(krizi|sikisma\w*)/,
    ],
  },
  {
    id: 'shortness-of-breath',
    label: 'Nefes darlığı / nefes almada güçlük',
    urgency: 'EMERGENCY',
    patterns: [
      /\bnefes\s+darlig\w*/,
      /\bnefes\s+alam\w*/,
      /\bsoluk\s+alam\w*/,
      /\bboguluyor\w*/,
    ],
  },
  {
    id: 'blood-vomiting',
    label: 'Kanlı kusma veya kahve telvesi görünümü',
    urgency: 'EMERGENCY',
    patterns: [
      /\bkanli\s+kus\w*/,
      /\bkan\s+kus\w*/,
      /\bkusm\w*\s+kan\b/,
      /\bkahve\s+telvesi\w*/,
      /\bhematemez\w*/,
    ],
  },
  {
    id: 'black-stool',
    label: 'Siyah / katran rengi dışkı',
    urgency: 'EMERGENCY',
    patterns: [
      /\bsiyah\s+diski\w*/,
      /\bkatran\s+(rengi\s+)?diski\w*/,
      /\bmelena\b/,
      /\bdiskida\s+kan\b/,
      /\bkanli\s+diski\w*/,
    ],
  },
  {
    id: 'dysphagia',
    label: 'Yutma güçlüğü veya lokmanın takılması (disfaji)',
    urgency: 'URGENT_EVALUATION',
    patterns: [
      /\byutma\s+guclug\w*/,
      /\byutmakta\s+zor\w*/,
      /\byutamiyor\w*/,
      /\blokma\w*\s+takil\w*/,
      /\byemek\w*\s+bogaz\w*\s+takil\w*/,
      /\bdisfaji\w*/,
    ],
  },
  {
    id: 'odynophagia',
    label: 'Ağrılı yutma (odinofaji)',
    urgency: 'URGENT_EVALUATION',
    patterns: [
      /\bagrili\s+yutma\w*/,
      /\byutarken\s+(siddetli\s+)?agri\w*/,
      /\byutkunurken\s+siddetli\s+agri\w*/,
      /\bodinofaji\w*/,
    ],
  },
  {
    id: 'unintended-weight-loss',
    label: 'İstemsiz / açıklanamayan kilo kaybı',
    urgency: 'URGENT_EVALUATION',
    patterns: [
      /\bistemsiz\s+kilo\s+kayb\w*/,
      /\baciklanamayan\s+kilo\s+kayb\w*/,
      /\bhizla\s+kilo\s+(ver\w*|kayb\w*)/,
      /\bistahsizlik\s+ve\s+kilo\s+kayb\w*/,
    ],
  },
  {
    id: 'persistent-vomiting',
    label: 'Geçmeyen / inatçı kusma',
    urgency: 'URGENT_EVALUATION',
    patterns: [
      /\bgecmeyen\s+kusma\w*/,
      /\bdurmayan\s+kusma\w*/,
      /\binatci\s+kusma\w*/,
      /\bsurekli\s+kusuyor\w*/,
    ],
  },
];

const NO_RED_FLAG_RESULT: Readonly<RedFlagDetectionResult> = Object.freeze({
  hasRedFlag: false,
  urgency: 'NONE',
  signals: [],
  headline: '',
  guidance: '',
});

export function detectRedFlags(rawText: string): RedFlagDetectionResult {
  const cleanedRaw = rawText.replace(/\s+/g, ' ').trim();
  const normalized = normalizeTurkishKeepLength(cleanedRaw);
  if (!normalized) return { ...NO_RED_FLAG_RESULT, signals: [] };

  const signals: RedFlagSignal[] = [];

  for (let r = 0; r < RED_FLAG_RULES.length; r++) {
    const rule = RED_FLAG_RULES[r];
    for (let p = 0; p < rule.patterns.length; p++) {
      const match = rule.patterns[p].exec(normalized);
      if (match && typeof match.index === 'number') {
        const originalPhrase = cleanedRaw
          .slice(match.index, match.index + match[0].length)
          .trim();
        signals.push({
          id: rule.id,
          label: rule.label,
          matchedPhrase: originalPhrase || match[0],
          urgency: rule.urgency,
        });
        break;
      }
    }
  }

  if (signals.length === 0) return { ...NO_RED_FLAG_RESULT, signals: [] };

  const isEmergency = signals.some((s) => s.urgency === 'EMERGENCY');

  return {
    hasRedFlag: true,
    urgency: isEmergency ? 'EMERGENCY' : 'URGENT_EVALUATION',
    signals,
    headline: isEmergency
      ? 'Kırmızı Bayrak Uyarısı: Acil Tıbbi Değerlendirme Gerekebilir'
      : 'Kırmızı Bayrak Uyarısı: Gecikmeden Hekim Değerlendirmesi Önerilir',
    guidance: isEmergency
      ? 'Kaydınızda göğüs ağrısı, nefes darlığı veya sindirim sistemi kanaması düşündürebilecek bir alarm ifadesi tespit edildi. Lütfen bunu reflü kabul ederek diyet önlemleriyle beklemeyin; 112 Acil Yardım veya en yakın acil servise başvurun.'
      : 'Kaydınızda yutma güçlüğü, ağrılı yutma, istemsiz kilo kaybı veya geçmeyen kusma gibi alarm belirtisi tespit edildi. Bu tür belirtiler ev tipi beslenme önerileriyle izlenmemeli, gecikmeden bir gastroenteroloji veya iç hastalıkları hekimi tarafından değerlendirilmelidir.',
  };
}
