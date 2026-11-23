import type { AssessmentRecord, RefluxLogEntry } from '../types/reflux';

function formatDateOffset(daysAgo: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function makeIso(dateStr: string, timeHHMM: string): string {
  return `${dateStr}T${timeHHMM}:00`;
}

export function createDemoLogs(): RefluxLogEntry[] {
  const rawSpecs: Array<{
    daysAgo: number;
    timeHHMM: string;
    bedtimeHHMM?: string;
    mealToSleepMinutes?: number;
    isLateMeal?: boolean;
    rawText: string;
    foods: RefluxLogEntry['foods'];
    symptoms: RefluxLogEntry['symptoms'];
    notesSummary?: string;
  }> = [
    {
      daysAgo: 13,
      timeHHMM: '21:40',
      bedtimeHHMM: '23:15',
      mealToSleepMinutes: 95,
      isLateMeal: true,
      rawText: 'Akşam 21:40 civarı salçalı mercimek çorbası ve kıymalı pide yedim, ertesi sabah boğaz temizleme ve ses kısıklığı oldu.',
      foods: [
        { rawName: 'salçalı mercimek çorbası', matchedFoodId: 'salcali-mercimek-corbasi', matchedFoodName: 'Salçalı Mercimek Çorbası / Ezogelin', status: 'VERIFIED', consensusLevel: 'individual_varies' },
        { rawName: 'kıymalı pide', matchedFoodId: 'lahmacun-pide', matchedFoodName: 'Lahmacun / Kıymalı Pide', status: 'VERIFIED', consensusLevel: 'common_trigger' },
      ],
      symptoms: [
        { code: 'THROAT_CLEARING', severity: 4 },
        { code: 'HOARSENESS', severity: 3 },
      ],
      notesSummary: 'Geç akşam öğünü sonrası sabah boğaz belirtisi',
    },
    {
      daysAgo: 12,
      timeHHMM: '09:15',
      rawText: 'Kahvaltıda haşlanmış yumurta, tam tahıllı ekmek, salatalık ve papatya çayı içtim. Gün boyu rahattım.',
      foods: [
        { rawName: 'haşlanmış yumurta', matchedFoodId: 'haslanmis-yumurta', matchedFoodName: 'Haşlanmış Yumurta', status: 'VERIFIED', consensusLevel: 'generally_tolerated' },
        { rawName: 'tam tahıllı ekmek', matchedFoodId: 'tam-tahilli-ekmek', matchedFoodName: 'Tam Tahıllı / Tam Buğday Ekmek', status: 'VERIFIED', consensusLevel: 'generally_tolerated' },
        { rawName: 'salatalık', matchedFoodId: 'salatalik', matchedFoodName: 'Salatalık', status: 'VERIFIED', consensusLevel: 'generally_tolerated' },
        { rawName: 'papatya çayı', matchedFoodId: 'papatya-cayi', matchedFoodName: 'Papatya Çayı', status: 'VERIFIED', consensusLevel: 'generally_tolerated' },
      ],
      symptoms: [],
      mealToSleepMinutes: 240,
      bedtimeHHMM: '23:30',
      notesSummary: 'Belirtisiz sakin gün',
    },
    {
      daysAgo: 11,
      timeHHMM: '15:30',
      rawText: 'Öğleden sonra iki bardak demli siyah çay ve bitter çikolata yedim, 1 saat sonra boğazda gıcık başladı.',
      foods: [
        { rawName: 'demli siyah çay', matchedFoodId: 'demli-siyah-cay', matchedFoodName: 'Demli Siyah Çay', status: 'VERIFIED', consensusLevel: 'individual_varies' },
        { rawName: 'bitter çikolata', matchedFoodId: 'cikolata', matchedFoodName: 'Bitter / Sütlü Çikolata', status: 'VERIFIED', consensusLevel: 'common_trigger' },
      ],
      symptoms: [
        { code: 'THROAT_IRRITATION', severity: 3 },
        { code: 'THROAT_CLEARING', severity: 3 },
      ],
      mealToSleepMinutes: 210,
      bedtimeHHMM: '23:30',
    },
    {
      daysAgo: 10,
      timeHHMM: '21:25',
      bedtimeHHMM: '23:10',
      mealToSleepMinutes: 105,
      isLateMeal: true,
      rawText: 'Saat 21:25 gibi domates salçası ile yapılan makarna ve limonlu soda içtim. Gece hafif mide yanması ve sabah boğazda yumru hissi vardı.',
      foods: [
        { rawName: 'domates salçası', matchedFoodId: 'domates-salcasi', matchedFoodName: 'Domates Salçası', status: 'VERIFIED', consensusLevel: 'common_trigger' },
        { rawName: 'limonlu soda', matchedFoodId: 'limonlu-soda', matchedFoodName: 'Limonlu / Meyveli Soda', status: 'VERIFIED', consensusLevel: 'common_trigger' },
      ],
      symptoms: [
        { code: 'HEARTBURN', severity: 2 },
        { code: 'GLOBUS_LUMP', severity: 4 },
        { code: 'THROAT_CLEARING', severity: 3 },
      ],
    },
    {
      daysAgo: 9,
      timeHHMM: '19:00',
      bedtimeHHMM: '23:15',
      mealToSleepMinutes: 255,
      rawText: '19:00 akşam yemeğinde ızgara tavuk göğsü, haşlanmış patates ve kabak yedim. Sabah hiç belirti olmadı.',
      foods: [
        { rawName: 'ızgara tavuk göğsü', matchedFoodId: 'izgara-tavuk', matchedFoodName: 'Izgara / Haşlanmış Tavuk Göğsü', status: 'VERIFIED', consensusLevel: 'generally_tolerated' },
        { rawName: 'haşlanmış patates', matchedFoodId: 'haslanmis-patates', matchedFoodName: 'Haşlanmış / Fırınlanmış Patates (Az Yağlı)', status: 'VERIFIED', consensusLevel: 'generally_tolerated' },
        { rawName: 'kabak', matchedFoodId: 'kabak', matchedFoodName: 'Kabak (Haşlama / Fırın / Zeytinyağlı)', status: 'VERIFIED', consensusLevel: 'generally_tolerated' },
      ],
      symptoms: [],
    },
    {
      daysAgo: 8,
      timeHHMM: '10:30',
      rawText: 'Sabah poğaça ve demli siyah çay içtim, öğlene doğru hafif mide yanması ve boğazda gıcık hissettim.',
      foods: [
        { rawName: 'poğaça', matchedFoodId: 'pogaca-acma', matchedFoodName: 'Poğaça / Açma', status: 'VERIFIED', consensusLevel: 'common_trigger' },
        { rawName: 'demli siyah çay', matchedFoodId: 'demli-siyah-cay', matchedFoodName: 'Demli Siyah Çay', status: 'VERIFIED', consensusLevel: 'individual_varies' },
      ],
      symptoms: [
        { code: 'HEARTBURN', severity: 2 },
        { code: 'THROAT_IRRITATION', severity: 3 },
      ],
      mealToSleepMinutes: 210,
      bedtimeHHMM: '23:00',
    },
    {
      daysAgo: 7,
      timeHHMM: '21:15',
      bedtimeHHMM: '23:00',
      mealToSleepMinutes: 105,
      isLateMeal: true,
      rawText: 'Akşam 21:15 civarı çiğ köfte dürüm yedim. Ertesi sabah geniz akıntısı ve öksürük vardı.',
      foods: [
        { rawName: 'çiğ köfte', matchedFoodId: 'cig-kofte', matchedFoodName: 'Çiğ Köfte', status: 'VERIFIED', consensusLevel: 'common_trigger' },
      ],
      symptoms: [
        { code: 'EXCESS_THROAT_MUCUS', severity: 4 },
        { code: 'POST_MEAL_COUGH', severity: 3 },
      ],
    },
    {
      daysAgo: 6,
      timeHHMM: '18:45',
      bedtimeHHMM: '23:00',
      mealToSleepMinutes: 255,
      rawText: '18:45 gibi sade sebze çorbası, beyaz pirinç pilavı ve yağsız yoğurt yedim. Gece ve sabah çok rahattım.',
      foods: [
        { rawName: 'sade sebze çorbası', matchedFoodId: 'sade-sebze-corbasi', matchedFoodName: 'Sade Sebze Çorbası (Salçasız)', status: 'VERIFIED', consensusLevel: 'generally_tolerated' },
        { rawName: 'beyaz pirinç', matchedFoodId: 'beyaz-pirinc', matchedFoodName: 'Beyaz Pirinç / Sade Pilav / Bulgur', status: 'VERIFIED', consensusLevel: 'generally_tolerated' },
        { rawName: 'yağsız yoğurt', matchedFoodId: 'yagsiz-yogurt', matchedFoodName: 'Yağsız / Yarım Yağlı Yoğurt', status: 'VERIFIED', consensusLevel: 'generally_tolerated' },
      ],
      symptoms: [],
    },
    {
      daysAgo: 5,
      timeHHMM: '14:20',
      rawText: 'Öğleden sonra Türk kahvesi içtim ve avokadolu tam buğday tost yedim; hafif boğaz temizleme oldu.',
      foods: [
        { rawName: 'Türk kahvesi', matchedFoodId: 'turk-kahvesi', matchedFoodName: 'Türk Kahvesi', status: 'VERIFIED', consensusLevel: 'common_trigger' },
        { rawName: 'tam tahıllı ekmek', matchedFoodId: 'tam-tahilli-ekmek', matchedFoodName: 'Tam Tahıllı / Tam Buğday Ekmek', status: 'VERIFIED', consensusLevel: 'generally_tolerated' },
      ],
      symptoms: [{ code: 'THROAT_CLEARING', severity: 2 }],
      mealToSleepMinutes: 230,
      bedtimeHHMM: '23:20',
    },
    {
      daysAgo: 4,
      timeHHMM: '21:50',
      bedtimeHHMM: '23:30',
      mealToSleepMinutes: 100,
      isLateMeal: true,
      rawText: 'Gece 21:50 geç yemek yedim, domates salçası soslu yemek ve demli siyah çay vardı. Sabah ses kısıklığı belirgindi.',
      foods: [
        { rawName: 'domates salçası', matchedFoodId: 'domates-salcasi', matchedFoodName: 'Domates Salçası', status: 'VERIFIED', consensusLevel: 'common_trigger' },
        { rawName: 'demli siyah çay', matchedFoodId: 'demli-siyah-cay', matchedFoodName: 'Demli Siyah Çay', status: 'VERIFIED', consensusLevel: 'individual_varies' },
      ],
      symptoms: [
        { code: 'HOARSENESS', severity: 4 },
        { code: 'THROAT_CLEARING', severity: 4 },
      ],
    },
    {
      daysAgo: 3,
      timeHHMM: '21:10',
      bedtimeHHMM: '00:25',
      mealToSleepMinutes: 195,
      isLateMeal: true,
      rawText: '21:10 gibi muz ve yulaf ezmesi yedim ama yatmak için 3 saatten fazla bekledim; sabah belirti olmadı.',
      foods: [
        { rawName: 'muz', matchedFoodId: 'muz', matchedFoodName: 'Muz', status: 'VERIFIED', consensusLevel: 'generally_tolerated' },
        { rawName: 'yulaf ezmesi', matchedFoodId: 'yulaf-ezmesi', matchedFoodName: 'Yulaf Ezmesi', status: 'VERIFIED', consensusLevel: 'generally_tolerated' },
      ],
      symptoms: [],
    },
    {
      daysAgo: 2,
      timeHHMM: '16:00',
      rawText: 'Arkadaşlarla çiğ köfte ve demli siyah çay tükettik, akşam boğazda gıcık ve hafif ağza acı su geldi.',
      foods: [
        { rawName: 'çiğ köfte', matchedFoodId: 'cig-kofte', matchedFoodName: 'Çiğ Köfte', status: 'VERIFIED', consensusLevel: 'common_trigger' },
        { rawName: 'demli siyah çay', matchedFoodId: 'demli-siyah-cay', matchedFoodName: 'Demli Siyah Çay', status: 'VERIFIED', consensusLevel: 'individual_varies' },
      ],
      symptoms: [
        { code: 'THROAT_IRRITATION', severity: 3 },
        { code: 'REGURGITATION', severity: 2 },
      ],
      mealToSleepMinutes: 220,
      bedtimeHHMM: '23:10',
    },
    {
      daysAgo: 1,
      timeHHMM: '19:15',
      bedtimeHHMM: '23:15',
      mealToSleepMinutes: 240,
      rawText: '19:15 akşam yemeğinde fırın balık, havuç, kabak ve rezene çayı içtim. Ertesi sabah boğazım çok rahattı.',
      foods: [
        { rawName: 'fırın balık', matchedFoodId: 'bugulama-balik', matchedFoodName: 'Buğulama / Fırın Balık (Az Yağlı)', status: 'VERIFIED', consensusLevel: 'generally_tolerated' },
        { rawName: 'havuç', matchedFoodId: 'havuc', matchedFoodName: 'Havuç', status: 'VERIFIED', consensusLevel: 'generally_tolerated' },
        { rawName: 'kabak', matchedFoodId: 'kabak', matchedFoodName: 'Kabak (Haşlama / Fırın / Zeytinyağlı)', status: 'VERIFIED', consensusLevel: 'generally_tolerated' },
        { rawName: 'rezene çayı', matchedFoodId: 'rezene-cayi', matchedFoodName: 'Rezene Çayı', status: 'VERIFIED', consensusLevel: 'generally_tolerated' },
      ],
      symptoms: [],
    },
    {
      daysAgo: 0,
      timeHHMM: '08:45',
      rawText: 'Sabah yulaf ezmesi, muz ve papatya çayı ile kahvaltı yaptım. Hafif sabah boğaz temizleme hissi vardı.',
      foods: [
        { rawName: 'yulaf ezmesi', matchedFoodId: 'yulaf-ezmesi', matchedFoodName: 'Yulaf Ezmesi', status: 'VERIFIED', consensusLevel: 'generally_tolerated' },
        { rawName: 'muz', matchedFoodId: 'muz', matchedFoodName: 'Muz', status: 'VERIFIED', consensusLevel: 'generally_tolerated' },
        { rawName: 'papatya çayı', matchedFoodId: 'papatya-cayi', matchedFoodName: 'Papatya Çayı', status: 'VERIFIED', consensusLevel: 'generally_tolerated' },
      ],
      symptoms: [{ code: 'THROAT_CLEARING', severity: 1 }],
    },
  ];

  return rawSpecs.map((spec, idx) => {
    const dateStr = formatDateOffset(spec.daysAgo);
    return {
      id: `demo-log-${idx + 1}`,
      timestamp: makeIso(dateStr, spec.timeHHMM),
      dateStr,
      timeHHMM: spec.timeHHMM,
      rawText: spec.rawText,
      foods: spec.foods,
      symptoms: spec.symptoms,
      bedtimeHHMM: spec.bedtimeHHMM,
      mealToSleepMinutes: spec.mealToSleepMinutes,
      isLateMeal: spec.isLateMeal,
      source: 'demo',
      notesSummary: spec.notesSummary,
    };
  });
}

export function createDemoAssessments(): AssessmentRecord[] {
  const olderDate = formatDateOffset(13);
  const latestDate = formatDateOffset(1);

  return [
    {
      id: 'demo-assessment-1',
      timestamp: `${olderDate}T10:00:00`,
      dateStr: olderDate,
      // Classic LPR profile: high throat clearing, hoarseness, mucus, globus; low heartburn
      rsiAnswers: [3, 4, 3, 0, 2, 0, 2, 3, 1],
      rsiTotal: 18,
      rsiSwallowingScore: 0,
      gerdqAnswers: [1, 1, 0, 0, 0, 1],
      gerdqBurdenScore: 3,
      gerdqHeartburnFreqIndex: 1,
      gerdqRegurgFreqIndex: 1,
      profileType: 'LPR_DOMINANT',
    },
    {
      id: 'demo-assessment-2',
      timestamp: `${latestDate}T09:30:00`,
      dateStr: latestDate,
      rsiAnswers: [2, 3, 3, 0, 2, 0, 1, 3, 1],
      rsiTotal: 15,
      rsiSwallowingScore: 0,
      gerdqAnswers: [1, 0, 0, 0, 0, 0],
      gerdqBurdenScore: 1,
      gerdqHeartburnFreqIndex: 1,
      gerdqRegurgFreqIndex: 0,
      profileType: 'LPR_DOMINANT',
    },
  ];
}
