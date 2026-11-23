import { memo, useCallback, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Info, LogIn } from 'lucide-react';
import { evaluateAssessment } from '../engine/correlationEngine';
import { createId } from '../lib/id';
import { getTodayLocalDateStr } from '../lib/time';
import type { AssessmentRecord } from '../types/reflux';
import type { AuthModalMode } from './AuthModal';
import { useToast } from './ToastProvider';
import { PageHeader } from './ui/PageHeader';

interface AssessmentViewProps {
  assessments: AssessmentRecord[];
  onSaveAssessment: (record: AssessmentRecord) => void | Promise<void>;
  canSave: boolean;
  isDemoPreview: boolean;
  onOpenAuth: (mode?: AuthModalMode) => void;
}

// EXACT 9 validated Belafsky Reflux Symptom Index (RSI — 2002) items
const RSI_ITEMS: string[] = [
  'Ses kısıklığı veya sesinizle ilgili bir sorun',
  'Boğazınızı temizleme ihtiyacı',
  'Aşırı boğaz salgısı veya geniz akıntısı',
  'Yiyecek, sıvı veya hap yutmakta zorluk',
  'Yemek yedikten sonra veya uzandığınızda öksürük',
  'Nefes alma güçlüğü veya boğulma hissi atakları',
  'Rahatsız edici veya inatçı öksürük',
  'Boğazınızda bir şey takılıyormuş veya yumru varmış hissi',
  'Göğüste yanma, göğüs ağrısı, hazımsızlık veya mide asidinin yukarı gelmesi',
];

// EXACT 6 GerdQ-inspired weekly frequency items
const GERDQ_ITEMS: string[] = [
  'Göğüs kemiğinizin arkasında yanma hissi (mide yanması)',
  'Mide içeriğinin (acı/ekşi sıvı veya yemek) boğaza/ağza geri gelmesi',
  'Üst karın bölgesinin ortasında ağrı',
  'Bulantı hissi',
  'Mide yanması veya ağza acı su gelmesi nedeniyle gece uykudan uyanma / uyumakta zorlanma',
  'Doktorun önerdiği düzenli tedavi dışında ek mide ilacı / antiasit alma ihtiyacı',
];

const GERDQ_OPTIONS = ['0 gün', '1 gün', '2-3 gün', '4-7 gün'] as const;

const PROFILE_SHORT_LABELS: Record<AssessmentRecord['profileType'], string> = {
  LPR_DOMINANT: 'Sessiz Reflü (LPR) Ağırlıklı',
  MIXED: 'Karma (GERD + LPR)',
  GERD_DOMINANT: 'Klasik Reflü (GERD)',
  LOW_SYMPTOM: 'Düşük Belirti',
};

export const AssessmentView = memo(function AssessmentView({
  assessments,
  onSaveAssessment,
  canSave,
  isDemoPreview,
  onOpenAuth,
}: AssessmentViewProps) {
  const { notify } = useToast();
  const [step, setStep] = useState<'rsi' | 'gerdq' | 'result'>('rsi');
  const [rsiAnswers, setRsiAnswers] = useState<number[]>(() => Array(9).fill(0));
  const [gerdqAnswers, setGerdqAnswers] = useState<number[]>(() => Array(6).fill(0));
  const [isSaving, setIsSaving] = useState(false);
  const [activeResult, setActiveResult] = useState<AssessmentRecord | null>(
    assessments[0] ?? null
  );

  const handleFinish = useCallback(async () => {
    if (isSaving) return;
    const evaluated = evaluateAssessment(rsiAnswers, gerdqAnswers);
    const now = new Date();

    const record: AssessmentRecord = {
      id: createId('assess'),
      timestamp: now.toISOString(),
      dateStr: getTodayLocalDateStr(now),
      ...evaluated,
    };

    if (canSave) {
      setIsSaving(true);
      try {
        await onSaveAssessment(record);
      } catch {
        return;
      } finally {
        setIsSaving(false);
      }
      notify({
        title: 'Belirti profiliniz kaydedildi',
        description: `RSI: ${record.rsiTotal}/45 · GERD Yükü: ${record.gerdqBurdenScore}/18`,
        variant: 'success',
      });
    } else {
      notify({
        title: 'Belirti profiliniz hesaplandı',
        description: 'Sonucu saklamak için hesabınızla giriş yapabilirsiniz.',
        variant: 'info',
      });
    }
    setActiveResult(record);
    setStep('result');
  }, [isSaving, rsiAnswers, gerdqAnswers, canSave, onSaveAssessment, notify]);

  const startFresh = useCallback(() => {
    setRsiAnswers(Array(9).fill(0));
    setGerdqAnswers(Array(6).fill(0));
    setStep('rsi');
  }, []);

  const rsiLiveSum = rsiAnswers.reduce((a, b) => a + b, 0);
  const gerdqLiveSum = gerdqAnswers.reduce((a, b) => a + b, 0);
  const progressPercent = step === 'rsi' ? 33 : step === 'gerdq' ? 66 : 100;

  return (
    <div className="space-y-6 sm:space-y-7">
      <PageHeader
        kicker="Klasik Reflü ve Sessiz Reflü Farkındalık Değerlendirmesi"
        title="Belirti Değerlendirme"
        actions={
          <div
            role="tablist"
            aria-label="Değerlendirme adımları"
            className="flex flex-wrap items-center gap-1 p-1 bg-[#EBF4FF] border border-[#DCE7F3] rounded-lg max-w-full"
          >
            <button
              type="button"
              role="tab"
              aria-selected={step === 'rsi'}
              onClick={() => setStep('rsi')}
              className={`min-h-9 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer ${
                step === 'rsi'
                  ? 'bg-white text-[#155CC0] shadow-xs'
                  : 'text-[#455D75] hover:text-[#0F233A]'
              }`}
            >
              1. Sessiz Reflü (RSI)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={step === 'gerdq'}
              onClick={() => setStep('gerdq')}
              className={`min-h-9 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer ${
                step === 'gerdq'
                  ? 'bg-white text-[#155CC0] shadow-xs'
                  : 'text-[#455D75] hover:text-[#0F233A]'
              }`}
            >
              2. Klasik Reflü (7 Gün)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={step === 'result'}
              disabled={!activeResult}
              onClick={() => activeResult && setStep('result')}
              className={`min-h-9 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap disabled:opacity-40 cursor-pointer ${
                step === 'result'
                  ? 'bg-white text-[#155CC0] shadow-xs'
                  : 'text-[#455D75] hover:text-[#0F233A]'
              }`}
            >
              3. Profil Özeti
            </button>
          </div>
        }
      />

      {/* Thin Calm Progress Indicator */}
      <div className="w-full h-1.5 rounded-full bg-[#E2EEF9] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#1D6FD6] transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* STEP 1: BELAFSKY RSI (9 ITEMS) */}
      {step === 'rsi' && (
        <section className="bg-white border border-[#DCE7F3] rounded-2xl p-4 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E6EFF8]">
            <div>
              <h2 className="text-lg font-semibold text-[#0F233A]">
                Bölüm 1: Sessiz Reflü Belirtileri (RSI)
              </h2>
              <p className="text-sm text-[#455D75] mt-0.5">
                Son 1 ay içinde aşağıdaki durumların sizi ne düzeyde etkilediğini işaretleyin.
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs text-[#688099]">Anlık RSI Toplamı</span>
              <p className="font-mono tabular-nums text-lg font-semibold text-[#155CC0]">
                {rsiLiveSum} / 45
              </p>
            </div>
          </div>

          {/* Inline Scale Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-lg bg-[#F7FBFF] border border-[#E2EEF9] text-xs text-[#455D75]">
            <span className="font-medium text-[#0F233A]">Puanlama Ölçeği:</span>
            <span className="font-mono tabular-nums">
              0 = Sorun yok · 1–2 = Hafif · 3 = Orta · 4–5 = Şiddetli sorun
            </span>
          </div>

          <ol className="divide-y divide-[#E6EFF8]">
            {RSI_ITEMS.map((itemText, idx) => (
              <li key={idx} className="py-4 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <p className="text-sm font-medium text-[#0F233A] leading-relaxed">
                    <span className="font-mono text-[#688099] mr-2">
                      {idx + 1}.
                    </span>
                    {itemText}
                  </p>
                  <div
                    role="group"
                    aria-label={`RSI Madde ${idx + 1} puanı`}
                    className="grid grid-cols-6 sm:flex items-center gap-1.5 shrink-0"
                  >
                    {[0, 1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() =>
                          setRsiAnswers((prev) =>
                            prev.map((v, i) => (i === idx ? score : v))
                          )
                        }
                        aria-pressed={rsiAnswers[idx] === score}
                        aria-label={`Madde ${idx + 1} için ${score} puan`}
                        className={`h-10 sm:w-9 sm:h-9 rounded-lg text-xs font-mono tabular-nums font-medium transition-colors cursor-pointer touch-manipulation ${
                          rsiAnswers[idx] === score
                            ? 'bg-[#1D6FD6] text-white'
                            : 'bg-[#F7FBFF] border border-[#DCE7F3] text-[#455D75] hover:border-[#1D6FD6] hover:text-[#155CC0]'
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </div>

                {idx === 3 && rsiAnswers[3] >= 3 && (
                  <div
                    role="note"
                    className="flex items-start gap-2.5 p-3.5 rounded-lg bg-[#FFFBEB] text-[#92400E] text-xs leading-relaxed"
                  >
                    <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <p>
                      Yutma güçlüğü maddesini yüksek işaretlediniz. Bu uygulama tıbbi tavsiye veya teşhis vermez; kişisel notunuz bu yanıtla birlikte kaydedilir.
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-[#E6EFF8]">
            <button
              type="button"
              onClick={() => setStep('gerdq')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1D6FD6] text-white text-sm font-medium hover:bg-[#1659B3] transition-colors whitespace-nowrap cursor-pointer"
            >
              Devam Et: Klasik Reflü (7 Gün)
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      {/* STEP 2: CLASSIC GERD WEEKLY FREQUENCY (6 ITEMS) */}
      {step === 'gerdq' && (
        <section className="bg-white border border-[#DCE7F3] rounded-2xl p-4 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E6EFF8]">
            <div>
              <h2 className="text-lg font-semibold text-[#0F233A]">
                Bölüm 2: Klasik Reflü (GERD) Haftalık Sıklık
              </h2>
              <p className="text-sm text-[#455D75] mt-0.5">
                Son 7 gün içinde aşağıdaki belirtileri kaç gün yaşadığınızı seçin.
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs text-[#688099]">Haftalık Sıklık Yükü</span>
              <p className="font-mono tabular-nums text-lg font-semibold text-[#155CC0]">
                {gerdqLiveSum} / 18
              </p>
            </div>
          </div>

          <ol className="divide-y divide-[#E6EFF8]">
            {GERDQ_ITEMS.map((itemText, idx) => (
              <li
                key={idx}
                className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <p className="text-sm font-medium text-[#0F233A] leading-relaxed">
                  <span className="font-mono text-[#688099] mr-2">
                    {idx + 1}.
                  </span>
                  {itemText}
                </p>
                <div
                  role="group"
                  aria-label={`Klasik Reflü Madde ${idx + 1} sıklığı`}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 shrink-0"
                >
                  {GERDQ_OPTIONS.map((optLabel, optIdx) => (
                    <button
                      key={optLabel}
                      type="button"
                      onClick={() =>
                        setGerdqAnswers((prev) =>
                          prev.map((v, i) => (i === idx ? optIdx : v))
                        )
                      }
                      aria-pressed={gerdqAnswers[idx] === optIdx}
                      className={`min-h-10 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer touch-manipulation ${
                        gerdqAnswers[idx] === optIdx
                          ? 'bg-[#1D6FD6] text-white'
                          : 'bg-[#F7FBFF] border border-[#DCE7F3] text-[#455D75] hover:border-[#1D6FD6] hover:text-[#155CC0]'
                      }`}
                    >
                      {optLabel}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E6EFF8]">
            <button
              type="button"
              onClick={() => setStep('rsi')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#DCE7F3] text-xs font-medium text-[#0F233A] hover:bg-[#F4F8FC] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              RSI Bölümüne Dön
            </button>
            <button
              type="button"
              onClick={handleFinish}
              disabled={isSaving}
              className="inline-flex items-center gap-2 min-h-11 px-5 py-2.5 rounded-lg bg-[#1D6FD6] text-white text-sm font-medium hover:bg-[#1659B3] disabled:opacity-60 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              {isSaving
                ? 'Kaydediliyor...'
                : canSave
                  ? 'Profili Hesapla ve Kaydet'
                  : 'Profili Hesapla (Geçici)'}
            </button>
          </div>
        </section>
      )}

      {/* STEP 3: DUAL-PROFILE VISUALIZATION */}
      {step === 'result' && activeResult && (
        <section className="space-y-6">
          <div className="bg-white border border-[#DCE7F3] rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E6EFF8]">
              <div>
                <p className="text-xs text-[#688099] font-mono tabular-nums">
                  Değerlendirme Tarihi: {activeResult.dateStr}
                </p>
                <h2 className="text-xl font-semibold text-[#0F233A] mt-0.5">
                  İki Eksenli Semptom Profili (GERD vs. Sessiz Reflü)
                </h2>
              </div>
              <button
                type="button"
                onClick={startFresh}
                className="px-4 py-2 rounded-lg border border-[#DCE7F3] bg-white text-xs font-medium text-[#0F233A] hover:bg-[#F4F8FC] whitespace-nowrap self-start cursor-pointer"
              >
                Yeni Değerlendirme Başlat
              </button>
            </div>

            {!canSave && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#F0F7FF] border border-[#CBE0FA]">
                <p className="text-xs text-[#0F233A] leading-relaxed">
                  Bu sonuç tarayıcıda saklanmaz. Sonucu kişisel doktor raporunuza ve geçmişinize kaydetmek için hesabınızla giriş yapabilirsiniz.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1D6FD6] text-white text-xs font-medium hover:bg-[#1659B3] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                  Giriş Yap / Kaydol
                </button>
              </div>
            )}

            {/* Dual Axis Comparison Bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Axis 1: Classic GERD */}
              <div className="p-5 rounded-xl bg-[#F7FBFF] border border-[#DCE7F3] space-y-3">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold text-[#0F233A]">
                    Klasik Reflü (GERD) Profili
                  </h3>
                  <span className="font-mono tabular-nums text-lg font-semibold text-[#0F233A]">
                    {activeResult.gerdqBurdenScore} / 18
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#DCE7F3] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#1D6FD6] transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((activeResult.gerdqBurdenScore / 18) * 100)
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-[#455D75] leading-relaxed">
                  Mide yanması sıklığı:{' '}
                  <strong className="text-[#0F233A]">
                    {GERDQ_OPTIONS[activeResult.gerdqHeartburnFreqIndex]}
                  </strong>{' '}
                  · Ağza acı su:{' '}
                  <strong className="text-[#0F233A]">
                    {GERDQ_OPTIONS[activeResult.gerdqRegurgFreqIndex]}
                  </strong>
                </p>
              </div>

              {/* Axis 2: Silent Reflux (LPR / RSI) */}
              <div className="p-5 rounded-xl bg-[#F7FBFF] border border-[#DCE7F3] space-y-3">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold text-[#0F233A]">
                    Sessiz Reflü (LPR · RSI)
                  </h3>
                  <span
                    className={`font-mono tabular-nums text-lg font-semibold ${
                      activeResult.rsiTotal > 13
                        ? 'text-[#B45309]'
                        : 'text-[#047857]'
                    }`}
                  >
                    {activeResult.rsiTotal} / 45
                  </span>
                </div>
                <div className="relative w-full h-2.5 rounded-full bg-[#DCE7F3] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      activeResult.rsiTotal > 13
                        ? 'bg-[#B45309]'
                        : 'bg-[#047857]'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((activeResult.rsiTotal / 45) * 100)
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-[#455D75] leading-relaxed">
                  Referans eşiği:{' '}
                  <strong className="font-mono text-[#0F233A]">13 üzeri</strong>{' '}
                  {activeResult.rsiTotal > 13
                    ? '(Eşik üzerinde boğaz odaklı semptom yükü)'
                    : '(Eşik değerin altında)'}
                </p>
              </div>
            </div>

            {/* Key Clarity Insight Box */}
            <div className="p-5 rounded-xl border border-[#DCE7F3] bg-white space-y-2.5">
              <h3 className="text-sm font-semibold text-[#0F233A]">
                {activeResult.profileType === 'LPR_DOMINANT'
                  ? 'Dikkat Çeken Tablo: Mide Yanması Düşük, Boğaz Odaklı Semptomlar Yüksek'
                  : activeResult.profileType === 'MIXED'
                    ? 'Karma Profil: Hem Klasik Reflü Hem Boğaz Odaklı Belirtiler Mevcut'
                    : activeResult.profileType === 'GERD_DOMINANT'
                      ? 'Klasik Reflü (GERD) Ağırlıklı Belirti Profili'
                      : 'Genel Semptom Yükü Düşük Düzeyde'}
              </h3>
              <p className="text-sm text-[#455D75] leading-relaxed">
                {activeResult.profileType === 'LPR_DOMINANT'
                  ? 'Yanıtlarınızda mide yanması puanı düşükken boğaz odaklı maddeler daha belirgin görünüyor. Günlük kayıtlarınızda öğün saatlerini ve boğaz hissinizi birlikte not ederek kendi ritminizi takip edebilirsiniz.'
                  : activeResult.profileType === 'MIXED'
                    ? 'Yanıtlarınızda hem mide yanması/ekşime hem de boğaz odaklı maddeler birlikte işaretlenmiş görünüyor. Düzenli günlük kayıtlarıyla hangi saatlerin ve öğünlerin size daha rahat geldiğini gözlemleyebilirsiniz.'
                    : activeResult.profileType === 'GERD_DOMINANT'
                      ? 'Yanıtlarınız ağırlıklı olarak göğüs yanması ve geri kaçış maddelerinde yoğunlaşıyor. Yemek saatlerinizi ve akşam düzeninizi günlükte izleyerek kendi kişisel örüntünüzü görebilirsiniz.'
                      : 'Mevcut yanıtlarınıza göre işaretlediğiniz belirti düzeyi düşük aralıkta görünüyor. İlerleyen haftalarda değişimi gözlemlemek için bu öz-değerlendirmeyi dilediğiniz zaman yenileyebilirsiniz.'}
              </p>

              {activeResult.rsiSwallowingScore >= 3 && (
                <p className="text-xs font-medium text-[#92400E] bg-[#FFFBEB] px-3.5 py-2.5 rounded-lg">
                  Not: Madde 4 (yutma güçlüğü) yanıtınız {activeResult.rsiSwallowingScore}/5 olarak kaydedildi. Bu uygulama tıbbi tavsiye vermez; sağlıkla ilgili her konuda bir sağlık profesyoneline danışabilirsiniz.
                </p>
              )}

              <p className="text-xs text-[#688099] pt-2 border-t border-[#E6EFF8] leading-relaxed">
                Bu sonuç tıbbi bir tavsiye veya teşhis değildir; yalnızca kendi bildirdiğiniz yanıtları zaman içinde düzenli takip etmeniz için oluşturulan kişisel bir özettir.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Assessment History Table */}
      <section className="bg-white border border-[#DCE7F3] rounded-2xl p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E6EFF8]">
          <h2 className="text-base font-semibold text-[#0F233A]">
            Geçmiş Değerlendirmeler ({assessments.length})
          </h2>
          <span className="text-xs text-[#688099]">
            {isDemoPreview
              ? 'Geçici örnek veriler'
              : 'Yalnızca hesabınıza özel bulutta tutulur'}
          </span>
        </div>
        {assessments.length === 0 ? (
          <p className="py-6 text-sm text-[#688099]">
            Tamamladığınız değerlendirmeler burada tarih sırasıyla saklanır.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E6EFF8] text-xs text-[#688099]">
                  <th className="py-3 pr-4 font-medium">Tarih</th>
                  <th className="py-3 px-4 font-medium text-right">RSI (LPR)</th>
                  <th className="py-3 px-4 font-medium text-right">GERD Yükü</th>
                  <th className="py-3 pl-4 font-medium">Profil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EFF8]">
                {assessments.map((a) => (
                  <tr key={a.id} className="hover:bg-[#F7FBFF]">
                    <td className="py-3 pr-4 font-mono tabular-nums text-xs text-[#0F233A]">
                      {a.dateStr}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-[#0F233A]">
                      {a.rsiTotal} / 45
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-[#0F233A]">
                      {a.gerdqBurdenScore} / 18
                    </td>
                    <td className="py-3 pl-4 text-xs text-[#455D75]">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveResult(a);
                          setStep('result');
                        }}
                        className="text-[#155CC0] hover:underline font-medium cursor-pointer"
                      >
                        {PROFILE_SHORT_LABELS[a.profileType]}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
});
