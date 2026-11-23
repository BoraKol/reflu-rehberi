import type { KnowledgeCard } from '../types/reflux';

export const KNOWLEDGE_CARDS: KnowledgeCard[] = [
  {
    id: 'sessiz-reflu-nedir',
    category: 'Sessiz Reflü',
    title: 'Mide yanması olmadan reflü olabilir mi? (LPR / Sessiz Reflü)',
    shortSummary:
      'Laringofaringeal Reflü (LPR), mide içeriğinin ve pepsin enziminin göğüste belirgin bir yanma oluşturmadan doğrudan gırtlak (larinks) ve boğaz dokusuna ulaşmasıyla ortaya çıkan bir tablodur. Yemek borusu asite karşı nispeten daha dayanıklıyken, boğaz ve ses telleri mukozası çok daha hassastır.',
    dailyApplication:
      'Sürekli boğaz temizleme, sabah ses kısıklığı, geniz akıntısı veya boğazda yumru hissi yaşıyorsanız ancak "midem yanmıyor" diyorsanız, bu belirtileri günlüğünüze kaydedin. Akşam geç yemek ve asidik içeceklerle ilişkisini takip edip KBB veya gastroenteroloji hekiminizle paylaşın.',
    references: [
      'Belafsky PC, Postma GN, Koufman JA. Validity and reliability of the Reflux Symptom Index (RSI). J Voice. 2002.',
      'Türk Gastroenteroloji Derneği (TGD) — Gastroözofageal Reflü Hastalığı Bilgilendirme Rehberi.',
    ],
  },
  {
    id: 'pepsin-aktivasyonu',
    category: 'Sessiz Reflü',
    title: 'Pepsin enzimi ve asidik gıdalar boğazı nasıl etkiler?',
    shortSummary:
      'Midede protein sindiren pepsin enzimi, reflü sırasında mikro düzeyde boğaz dokusuna tutunabilir. Pepsin düşük asitli ortamda inaktif kalsa da gün içinde tükettiğiniz yüksek asitli içecekler veya soslar (limon, sirke, gazlı içecek, domates salçası) bu enzimi doğrudan boğazda yeniden aktive edebilir.',
    dailyApplication:
      'Sessiz reflü alevlenme dönemlerinde sadece yağlı gıdaları değil; limonlu soda, sirke, turşu, nar ekşisi ve yoğun salçalı sosları geçici olarak azaltıp 2 hafta boyunca boğaz belirtilerinizdeki değişimi gözlemleyin.',
    references: [
      'Koufman JA. Low-acid diet for recalcitrant laryngopharyngeal reflux: therapeutic benefits and their implications. Ann Otol Rhinol Laryngol. 2011.',
      'FDA Gıda Asitliği (pH) Sınıflandırma İlkeleri.',
    ],
  },
  {
    id: 'yasak-listesi-yerine-kisisel-kanit',
    category: 'Beslenme Mekaniği',
    title: 'Neden herkese tek tip "yasak besin listesi" uygulanmaz?',
    shortSummary:
      'Amerikan Gastroenteroloji Koleji (ACG 2022) kılavuzu, tüm reflü hastalarına istisnasız uzun yasak listeleri dayatmak yerine, bilimsel olarak bilinen yaygın tetikleyicilerin kişisel belirtilerle ilişkisinin test edilmesini önerir. Bir kişide şiddetli yanma yapan çay veya yoğurt, başka birinde hiçbir belirti vermeyebilir.',
    dailyApplication:
      'Gereksiz yere her besini keserek beslenmenizi kısıtlamak yerine, şüpheli gıdayı en az 3 farklı günde kayıt altına alın. Kendi verinizde yüksek belirti oranı görüyorsanız o gıdayı sınırlayın veya porsiyon/saat değişikliği deneyin.',
    references: [
      'Katz PO, Dunbar KB, Schnoll-Sussman FH, et al. ACG Clinical Guideline for the Diagnosis and Management of Gastroesophageal Reflux Disease. Am J Gastroenterol. 2022.',
    ],
  },
  {
    id: 'yag-ve-les-mekanizmasi',
    category: 'Beslenme Mekaniği',
    title: 'Yüksek yağ, çikolata ve nane kapağı nasıl gevşetir?',
    shortSummary:
      'Mide ile yemek borusu arasındaki alt yemek borusu kapağı (LES) tek yönlü bir valf gibi çalışır. Kızartmalar ve yağlı hamur işleri midenin boşalmasını geciktirirken; çikolata, kafein, alkol ve nane/mentol doğrudan bu kapağın gevşeme sıklığını artırabilir.',
    dailyApplication:
      'Reflü atağı sırasında "mideyi rahatlatsın" diye nane-limon çayı veya mentollü pastil kullanmak kapak gevşemesi nedeniyle belirtiyi uzatabilir. Bunun yerine ılık papatya, rezene çayı veya yudum yudum sade su daha güvenli seçeneklerdir.',
    references: [
      'ACG Clinical Guideline for GERD (2022) — Yaşam Tarzı ve Diyet Önerileri.',
      'Türk Gastroenteroloji Derneği (TGD) Reflü Beslenme İlkeleri.',
    ],
  },
  {
    id: 'uc-saat-ve-sol-taraf',
    category: 'Uyku & Duruş',
    title: 'Neden yemekten sonra en az 3 saat beklemek ve sol tarafa yatmak gerekir?',
    shortSummary:
      'Ayakta veya dik otururken yerçekimi mide içeriğini aşağıda tutar. Mide doluyken yatay konuma geçildiğinde bu koruma ortadan kalkar. Ayrıca midenin anatomik kıvrımı (fundus) sol taraftadır: sol yanınıza yattığınızda yemek borusu girişi mide asidi havuzunun üstünde kalır; sağ yanınıza yattığınızda ise asit doğrudan kapağa doğru yaslanır.',
    dailyApplication:
      'Akşam yemeğini yatmadan en az 3 saat önce (sessiz reflü şikayetleri yoğunsa 4 saat önce) bitirmeyi hedefleyin. Gece belirtisi yaşıyorsanız yatak başını 15–20 cm yükseltmek (sadece boynu kıran ek yastık yerine eğimli destek kullanmak) ve sol yana yatmak belirgin fayda sağlar.',
    references: [
      'Katz PO et al. ACG Clinical Guideline for GERD. Am J Gastroenterol. 2022.',
      'Schuitenmaker JM et al. Sleep positional therapy for nocturnal gastroesophageal reflux. Clin Gastroenterol Hepatol. 2022.',
    ],
  },
  {
    id: 'kirmizi-bayraklar',
    category: 'Doktora Ne Zaman?',
    title: 'Kırmızı Bayraklar: Diyetle beklenmemesi gereken alarm belirtileri',
    isRedFlagCard: true,
    shortSummary:
      'Reflü yaygın ve çoğu zaman yaşam tarzı + hekim tedavisiyle yönetilebilen bir durumdur. Ancak bazı belirtiler basit reflü ile açıklanamaz ve gecikmeden hekim değerlendirmesi gerektirir: yutma güçlüğü veya lokmanın takılması (disfaji), ağrılı yutma, istemsiz kilo kaybı, kanlı veya kahve telvesi görünümünde kusma, siyah/katran rengi dışkı, geçmeyen kusma ve şiddetli göğüs ağrısı.',
    dailyApplication:
      'Göğüste baskı/sıkışma tarzı ağrı, kol/çene/sırta yayılım veya nefes darlığı varsa bunu reflü sanarak beklemeyin — acil sağlık yardımı (112) alın. Yutma güçlüğü, kilo kaybı veya kanama şüphesinde ise ev önlemleriyle vakit kaybetmeden gastroenteroloji hekimine başvurun.',
    references: [
      'ACG Clinical Guideline for GERD (2022) — Alarm Symptoms & Endoscopy Indications.',
      'Türk Gastroenteroloji Derneği (TGD) — Reflüde Alarm Belirtileri.',
    ],
  },
  {
    id: 'doktor-randevusuna-hazirlik',
    category: 'Doktora Ne Zaman?',
    title: 'Hekim randevusuna giderken hangi veriler en çok işe yarar?',
    shortSummary:
      'Klinik muayenede "bazen midem yanıyor" veya "boğazım gıcıklanıyor" gibi genel ifadeler yerine; belirtilerin haftalık sıklığı, gece uykusunu bölüp bölmediği, son yemek–uyku aralığı ve standart RSI/GerdQ tarama skorları hekimin tabloyu çok daha net görmesini sağlar.',
    dailyApplication:
      'Randevunuzdan önce en az 1–2 hafta boyunca öğün saatlerinizi ve belirtilerinizi kaydedin. Uygulamadaki "Doktor Raporu" sekmesinden 1 sayfalık A4 özeti yazdırarak veya PDF olarak yanınıza alın.',
    references: [
      'Belafsky PC et al. Reflux Symptom Index (RSI). J Voice. 2002.',
      'Jones R et al. Development of the GerdQ questionnaire for diagnosis and management of GERD. Aliment Pharmacol Ther. 2009.',
    ],
  },
];
