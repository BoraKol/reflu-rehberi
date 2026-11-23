import { memo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Database,
  Eye,
  FileText,
  Lock,
  LogIn,
  PenLine,
  Search,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import type { ActiveTab } from '../../types/reflux';
import type { AuthModalMode } from '../AuthModal';

interface LandingPageProps {
  readabilityMode: boolean;
  onToggleReadability: () => void;
  onOpenAuth: (mode?: AuthModalMode) => void;
  onStartDemo: (targetTab?: ActiveTab) => void;
  onOpenPrivacy: () => void;
}

interface FeatureCardItem {
  id: ActiveTab;
  title: string;
  tag: string;
  description: string;
  ctaLabel: string;
  icon: typeof Clock;
  accentBg: string;
  accentText: string;
}

const FEATURES: readonly FeatureCardItem[] = [
  {
    id: 'dashboard',
    title: '7 Günlük Ritim & Yemek–Uyku Kalkanı',
    tag: 'Günlük Takip',
    description:
      'Son öğün saatine göre 3 saat (GERD) veya 4 saat (LPR) güvenli yatış geri sayımı, 7 günlük yoğunluk haritası ve tarayıcı bildirimleri.',
    ctaLabel: 'Bugün ekranını önizle',
    icon: Clock,
    accentBg: 'bg-[#EBF4FF]',
    accentText: 'text-[#155CC0]',
  },
  {
    id: 'logger',
    title: 'Hızlı Kayıt & Kırmızı Bayrak Koruması',
    tag: 'AI + Çevrimdışı',
    description:
      'Doğal Türkçe metin, öğün fotoğrafı veya tek tık kısayollarla 2 saniyede kayıt. Alarm belirtileri için deterministik güvenlik uyarısı.',
    ctaLabel: 'Hızlı Kayıt ekranını önizle',
    icon: PenLine,
    accentBg: 'bg-[#ECFDF5]',
    accentText: 'text-[#047857]',
  },
  {
    id: 'foods',
    title: '63+ Besin Rehberi & Barkod Tarayıcı',
    tag: 'Open Food Facts',
    description:
      'Uydurma pH rakamı olmadan fizyolojik mekanizmaya göre kategorize besinler ve paketli ürünlerde sitrik asit, kafein, yüksek yağ taraması.',
    ctaLabel: 'Besin rehberini önizle',
    icon: Search,
    accentBg: 'bg-[#FFFBEB]',
    accentText: 'text-[#B45309]',
  },
  {
    id: 'detective',
    title: 'Kişisel Tetikleyici Dedektifi',
    tag: 'En az 3 kayıt kuralı',
    description:
      'Tesadüfi çıkarım yapmayan saf matematik korelasyon motoru, 30 günlük GERD vs. LPR grafiği ve saat bazlı yemek–belirti zaman çizgisi.',
    ctaLabel: 'Dedektif analizini önizle',
    icon: BarChart3,
    accentBg: 'bg-[#EBF4FF]',
    accentText: 'text-[#155CC0]',
  },
  {
    id: 'assessment',
    title: 'Belirti Değerlendirme (RSI & GERD)',
    tag: 'İki Eksenli Profil',
    description:
      '9 maddelik Belafsky Sessiz Reflü (RSI) ve 6 maddelik haftalık Klasik Reflü sıklık değerlendirmesiyle kendi semptom profilini takip et.',
    ctaLabel: 'Değerlendirmeyi önizle',
    icon: ClipboardCheck,
    accentBg: 'bg-[#F0F7FF]',
    accentText: 'text-[#1D6FD6]',
  },
  {
    id: 'report',
    title: 'Tek Sayfalık A4 Doktor Raporu',
    tag: 'Yazdır & JSON Yedek',
    description:
      'Hekim görüşmelerine hazırlanmak için tarama puanları, tetikleyici oranları ve yemek–uyku ortalamasını içeren yazdırılabilir A4 özet.',
    ctaLabel: 'Doktor raporunu önizle',
    icon: FileText,
    accentBg: 'bg-[#ECFDF5]',
    accentText: 'text-[#047857]',
  },
] as const;

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Kısa Notunu Bırak',
    detail:
      'Ne yediğini Türkçe yaz, fotoğraf ekle veya tek dokunuşla kısayol seç. Kaydetmeden önce tüm etiketleri sen onayla.',
  },
  {
    step: '02',
    title: 'Kendi Örüntünü Keşfet',
    detail:
      'Aynı besin veya geç öğün en az 3 kez kaydedildiğinde, genel klinik bilgi ile senin kişisel verin yan yana karşılaştırılır.',
  },
  {
    step: '03',
    title: 'Görüşmeye Hazır Git',
    detail:
      'Haftalık GERD/LPR eğilimlerini ve tetikleyici özetini tek tıkla A4 Doktor Raporu olarak yazdır veya PDF kaydet.',
  },
] as const;

const PREVIEW_DAYS = [
  { day: 'Pzt', h: 32, cls: 'bg-[#10B981]' },
  { day: 'Sal', h: 48, cls: 'bg-[#3B82F6]' },
  { day: 'Çar', h: 30, cls: 'bg-[#10B981]' },
  { day: 'Per', h: 72, cls: 'bg-[#F59E0B]' },
  { day: 'Cum', h: 86, cls: 'bg-[#EF4444]' },
  { day: 'Cmt', h: 46, cls: 'bg-[#3B82F6]' },
  { day: 'Bugün', h: 30, cls: 'bg-[#10B981]' },
] as const;

export const LandingPage = memo(function LandingPage({
  readabilityMode,
  onToggleReadability,
  onOpenAuth,
  onStartDemo,
  onOpenPrivacy,
}: LandingPageProps) {
  return (
    <div className="min-h-dvh bg-[#F4F8FC] text-[#0F233A] flex flex-col overflow-x-clip">
      {/* Top Sticky Landing Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-[#DCE7F3] pt-[env(safe-area-inset-top)]">
        <div className="max-w-[1140px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <a
            href="#top"
            className="flex items-center gap-2.5 min-w-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D6FD6] rounded-lg"
          >
            <img
              src="/app-icon.png"
              alt="ReflüRehber"
              width={32}
              height={32}
              className="w-8 h-8 rounded-lg object-cover shrink-0 ring-1 ring-[#CBE0FA] shadow-[0_2px_6px_rgba(29,111,214,0.14)]"
            />
            <span className="font-display text-[17px] font-bold tracking-tight text-[#0F233A] whitespace-nowrap">
              ReflüRehber
            </span>
          </a>

          <nav
            aria-label="Tanıtım bölümleri"
            className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#455D75]"
          >
            <a href="#ozellikler" className="hover:text-[#155CC0] transition-colors">
              Özellikler
            </a>
            <a href="#nasil-calisir" className="hover:text-[#155CC0] transition-colors">
              Nasıl Çalışır?
            </a>
            <a href="#gizlilik" className="hover:text-[#155CC0] transition-colors">
              Gizlilik &amp; Güvenlik
            </a>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleReadability}
              aria-pressed={readabilityMode}
              aria-label={
                readabilityMode
                  ? 'Okunabilirlik Modu açık, kapatmak için tıklayın'
                  : 'Okunabilirlik Modu kapalı, açmak için tıklayın'
              }
              title="Yüksek kontrastlı metin ve geniş satır aralığı"
              className={`inline-flex items-center justify-center gap-1.5 min-h-9 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                readabilityMode
                  ? 'border-[#0A469B] bg-[#0A469B] text-white hover:bg-[#083880]'
                  : 'border-[#DCE7F3] bg-white text-[#455D75] hover:text-[#0F233A] hover:bg-[#F4F8FC]'
              }`}
            >
              <Eye
                className={`w-3.5 h-3.5 shrink-0 ${
                  readabilityMode ? 'text-white' : 'text-[#1D6FD6]'
                }`}
                aria-hidden="true"
              />
              <span className="hidden md:inline">
                {readabilityMode ? 'Okunabilirlik · Açık' : 'Okunabilirlik'}
              </span>
              <span className="md:hidden">Okuma</span>
            </button>

            <button
              type="button"
              onClick={() => onStartDemo('dashboard')}
              className="hidden md:inline-flex items-center justify-center gap-1.5 min-h-9 px-3 py-1.5 rounded-lg border border-[#DCE7F3] bg-white text-xs font-medium text-[#455D75] hover:text-[#0F233A] hover:bg-[#F4F8FC] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-[#1D6FD6]" aria-hidden="true" />
              Örnek Önizle
            </button>

            <button
              type="button"
              onClick={() => onOpenAuth('register')}
              className="hidden sm:inline-flex items-center justify-center gap-1.5 min-h-9 px-3 py-1.5 rounded-lg border border-[#BBD6F7] bg-[#F0F7FF] text-xs font-medium text-[#155CC0] hover:bg-[#E2EEF9] transition-colors whitespace-nowrap cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
              Kaydol
            </button>

            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="inline-flex items-center justify-center gap-1.5 min-h-9 px-3 sm:px-3.5 py-1.5 rounded-lg bg-[#1D6FD6] text-white text-xs font-medium hover:bg-[#1659B3] transition-colors whitespace-nowrap cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              Giriş Yap
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* HERO SECTION */}
        <section className="relative border-b border-[#DCE7F3] bg-gradient-to-b from-white via-[#F7FBFF] to-[#F4F8FC]">
          <div className="max-w-[1140px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              {/* Left: Value Proposition & CTAs */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EBF4FF] border border-[#CBE0FA] text-xs font-semibold text-[#155CC0]">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>GERD &amp; Sessiz Reflü (LPR) Kişisel Takip Rehberi</span>
                </div>

                <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-[#0F233A] leading-[1.15]">
                  Mide yanmasından boğaz gıcığına,{' '}
                  <span className="text-[#155CC0]">kendi tetikleyicilerini</span> netçe keşfet.
                </h1>

                <p className="text-base sm:text-[17px] text-[#455D75] leading-relaxed max-w-2xl">
                  ReflüRehber; klasik reflü (GERD) ve sessiz reflü (LPR) belirtilerini aynı çatı altında izleyen, genel klinik uzlaşıyı senin kişisel gözlemlerinden şeffaf biçimde ayıran ve uydurma tahmin üretmeyen sade bir takip günlüğüdür.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => onOpenAuth('register')}
                    className="inline-flex items-center justify-center gap-2 min-h-12 px-6 py-3 rounded-xl bg-[#1D6FD6] text-white text-sm font-semibold hover:bg-[#1659B3] shadow-[0_8px_20px_-6px_rgba(29,111,214,0.45)] transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" aria-hidden="true" />
                    Ücretsiz Hesap Oluştur
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onStartDemo('dashboard')}
                    className="inline-flex items-center justify-center gap-2 min-h-12 px-5 py-3 rounded-xl border border-[#C6D9ED] bg-white text-[#0F233A] text-sm font-semibold hover:bg-[#F0F7FF] hover:border-[#1D6FD6] transition-colors cursor-pointer"
                  >
                    <Database className="w-4 h-4 text-[#1D6FD6]" aria-hidden="true" />
                    14 Günlük Örnek Veriyi İncele
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-xs text-[#455D75]">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#047857] shrink-0" aria-hidden="true" />
                    Tarayıcıda sıfır sağlık verisi
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#047857] shrink-0" aria-hidden="true" />
                    Tıbbi tavsiye değil, kişisel gözlem günlüğü
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenAuth('login')}
                    className="font-semibold text-[#155CC0] hover:underline cursor-pointer"
                  >
                    Zaten hesabın var mı? Giriş Yap →
                  </button>
                </div>
              </div>

              {/* Right: Clinical UI Preview Card */}
              <div className="lg:col-span-5">
                <div
                  aria-label="Uygulama arayüz önizlemesi"
                  className="bg-white border border-[#DCE7F3] rounded-2xl shadow-[0_20px_50px_-20px_rgba(15,35,58,0.18)] overflow-hidden"
                >
                  <div className="px-5 py-3.5 bg-[#F7FBFF] border-b border-[#E6EFF8] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#1D6FD6]" aria-hidden="true" />
                      <span className="text-xs font-semibold text-[#0F233A]">
                        7 Günlük Ritim &amp; Kalkan Önizlemesi
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-semibold text-[#155CC0] bg-[#EBF4FF] px-2 py-0.5 rounded-md">
                      GERD + LPR
                    </span>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Mini 7-Day Visual Rhythm Bars */}
                    <div className="grid grid-cols-7 gap-1.5">
                      {PREVIEW_DAYS.map((d) => (
                        <div
                          key={d.day}
                          className="flex flex-col items-center p-1.5 rounded-xl bg-[#FAFBFD] border border-[#E6EFF8]"
                        >
                          <div className="w-full max-w-[20px] h-12 rounded-md bg-[#EBF2F9] flex items-end p-0.5 overflow-hidden">
                            <div
                              className={`w-full rounded-xs ${d.cls}`}
                              style={{ height: `${d.h}%` }}
                            />
                          </div>
                          <span className="mt-1.5 text-[10px] font-semibold text-[#455D75]">
                            {d.day}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Sleep Shield Strip */}
                    <div className="p-3.5 rounded-xl bg-[#F0F7FF] border border-[#CBE0FA] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-[#1D6FD6] text-white flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#0F233A]">
                            3 Saat Yemek–Uyku Kalkanı
                          </p>
                          <p className="text-[11px] text-[#455D75]">
                            Hedeflenen güvenli yatış saati
                          </p>
                        </div>
                      </div>
                      <span className="font-mono tabular-nums text-base font-bold text-[#155CC0] shrink-0">
                        23:30
                      </span>
                    </div>

                    {/* Sample Verified Personal Pattern */}
                    <div className="p-3.5 rounded-xl bg-white border border-[#DCE7F3] space-y-2">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-[#0F233A]">
                          21:00 Sonrası Geç Öğün
                        </span>
                        <span className="font-mono tabular-nums font-semibold text-[#B91C1C]">
                          4 / 5 gece · %80
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#E2EEF9] overflow-hidden">
                        <div className="h-full w-4/5 rounded-full bg-[#B91C1C]" />
                      </div>
                      <p className="text-[11px] text-[#688099]">
                        Minimum örneklem koruması (≥3 kayıt) aktif · Halüsinasyonsuz saf oran
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* KEY NUMBERS STRIP */}
        <section aria-label="Öne çıkan metrikler" className="bg-white border-b border-[#DCE7F3]">
          <div className="max-w-[1140px] mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div>
              <p className="font-mono text-2xl font-bold text-[#155CC0] tabular-nums">63+</p>
              <p className="text-xs text-[#455D75] mt-0.5">Doğrulanmış Türkçe besin kaydı</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-bold text-[#0F233A] tabular-nums">≥ 3</p>
              <p className="text-xs text-[#455D75] mt-0.5">Minimum örneklem koruması</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-bold text-[#047857] tabular-nums">0 Byte</p>
              <p className="text-xs text-[#455D75] mt-0.5">Tarayıcıda bırakılan sağlık verisi</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-bold text-[#0F233A] tabular-nums">A4 PDF</p>
              <p className="text-xs text-[#455D75] mt-0.5">Tek sayfalık doktor görüşme özeti</p>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="ozellikler" className="max-w-[1140px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18 space-y-10">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold text-[#155CC0] uppercase tracking-wider">
              Uygulama Modülleri
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F233A]">
              Tek bir uygulamada eksiksiz kişisel takip araçları
            </h2>
            <p className="text-sm sm:text-base text-[#455D75] leading-relaxed">
              Her modülü 14 günlük örnek veriyle hemen inceleyebilir veya kendi hesabını açıp kişisel günlüğüne başlayabilirsin.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <article
                  key={feat.id}
                  className="bg-white border border-[#DCE7F3] rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-5 hover:border-[#BBD6F7] transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={`w-10 h-10 rounded-xl ${feat.accentBg} ${feat.accentText} flex items-center justify-center shrink-0`}
                      >
                        <Icon className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-[#F4F8FC] text-[#455D75]">
                        {feat.tag}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-[#0F233A] leading-snug">
                      {feat.title}
                    </h3>
                    <p className="text-sm text-[#455D75] leading-relaxed">
                      {feat.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onStartDemo(feat.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#155CC0] hover:text-[#1D6FD6] cursor-pointer self-start"
                  >
                    <span>{feat.ctaLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="nasil-calisir" className="bg-white border-y border-[#DCE7F3]">
          <div className="max-w-[1140px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 space-y-8">
            <div className="max-w-xl space-y-2">
              <p className="text-xs font-semibold text-[#155CC0] uppercase tracking-wider">
                Nasıl Çalışır?
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F233A]">
                3 adımda düzenli kişisel farkındalık
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {HOW_IT_WORKS.map((item) => (
                <div
                  key={item.step}
                  className="p-5 sm:p-6 rounded-2xl bg-[#F7FBFF] border border-[#E2EEF9] space-y-2.5"
                >
                  <span className="font-mono text-xs font-bold text-[#155CC0] bg-[#EBF4FF] px-2.5 py-1 rounded-md inline-block">
                    ADIM {item.step}
                  </span>
                  <h3 className="text-base font-semibold text-[#0F233A]">{item.title}</h3>
                  <p className="text-sm text-[#455D75] leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRIVACY & CLINICAL SAFETY */}
        <section id="gizlilik" className="max-w-[1140px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 space-y-8">
          <div className="bg-white border border-[#DCE7F3] rounded-2xl p-6 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#155CC0]">
                <Lock className="w-4 h-4" aria-hidden="true" />
                <span>Gizlilik ve Klinik Güvenlik İlkeleri</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F233A]">
                Sağlık kayıtların yalnızca senin hesabına özeldir
              </h2>
              <p className="text-sm sm:text-base text-[#455D75] leading-relaxed">
                ReflüRehber, kişisel kayıtlarını tarayıcının yerel depolama alanlarında saklamaz. Giriş yaptığında verilerin yalnızca doğrulanmış hesabına izole sunucu kurallarıyla korunur; çıkış yaptığında ekrandaki her şey bellekten anında temizlenir.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={onOpenPrivacy}
                  className="inline-flex items-center gap-1.5 min-h-10 px-4 py-2 rounded-lg border border-[#BBD6F7] bg-[#F0F7FF] text-xs font-semibold text-[#155CC0] hover:bg-[#E2EEF9] cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                  Gizlilik Politikasını İncele
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-3">
              <div className="p-4 rounded-xl bg-[#F7FBFF] border border-[#DCE7F3] flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#1D6FD6] shrink-0 mt-0.5" aria-hidden="true" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-[#0F233A]">E-posta Doğrulamalı Hesap İzolasyonu</p>
                  <p className="text-[#455D75] leading-relaxed">
                    Sunucu tarafı kurallar başka kullanıcıların veya doğrulanmamış hesapların kayıtlarına erişimini engeller.
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#FEF2F2]/60 border border-[#FECACA] flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#B91C1C] shrink-0 mt-0.5" aria-hidden="true" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-[#991B1B]">Deterministik Kırmızı Bayrak Koruması</p>
                  <p className="text-[#455D75] leading-relaxed">
                    Göğüs ağrısı, yutma güçlüğü veya kanama gibi alarm ifadeleri anında tespit edilir; uygulama tıbbi teşhis yerine geçmez.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Final Conversion Banner */}
          <div className="rounded-2xl bg-[#155CC0] text-white p-6 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Kişisel reflü günlüğünü bugün başlat
              </h2>
              <p className="text-sm text-blue-100 leading-relaxed">
                Ücretsiz hesap oluşturarak tüm cihazlarından güvenle devam edebilir veya önce 14 günlük örnek veriyi inceleyebilirsin.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="inline-flex items-center justify-center gap-2 min-h-11 px-5 py-2.5 rounded-xl bg-white text-[#155CC0] text-sm font-semibold hover:bg-[#EBF4FF] transition-colors whitespace-nowrap cursor-pointer"
              >
                <LogIn className="w-4 h-4" aria-hidden="true" />
                Giriş Yap / Başla
              </button>
              <button
                type="button"
                onClick={() => onStartDemo('dashboard')}
                className="inline-flex items-center justify-center gap-2 min-h-11 px-5 py-2.5 rounded-xl border border-white/30 bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Database className="w-4 h-4" aria-hidden="true" />
                Örnek Veriyi Gör
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Landing Footer */}
      <footer className="bg-white border-t border-[#DCE7F3] pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-[1140px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#688099]">
          <div className="flex items-center gap-2">
            <img
              src="/app-icon.png"
              alt=""
              width={20}
              height={20}
              className="w-5 h-5 rounded-md object-cover"
            />
            <span className="font-semibold text-[#0F233A]">ReflüRehber</span>
            <span aria-hidden="true">·</span>
            <span>Tıbbi tavsiye vermez, kişisel gözlem günlüğüdür.</span>
          </div>
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="font-medium text-[#155CC0] hover:text-[#1D6FD6] underline underline-offset-2 cursor-pointer"
          >
            Gizlilik Politikası
          </button>
        </div>
      </footer>
    </div>
  );
});
