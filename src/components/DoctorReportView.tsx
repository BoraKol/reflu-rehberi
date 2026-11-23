import { memo, useCallback, useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import {
  computePersonalPatterns,
  computeSleepGapComparison,
  MIN_SAMPLE_SIZE,
} from '../engine/correlationEngine';
import { getTodayLocalDateStr } from '../lib/time';
import {
  SYMPTOM_CATALOG,
  type AppPersistedState,
  type AssessmentRecord,
  type RefluxLogEntry,
  type SymptomCode,
} from '../types/reflux';
import { DataBackupNotice } from './DataBackupNotice';
import { useToast } from './ToastProvider';
import { PageHeader } from './ui/PageHeader';

const PROFILE_LABELS: Record<AssessmentRecord['profileType'], string> = {
  LPR_DOMINANT: 'Sessiz Reflü (LPR) Ağırlıklı',
  MIXED: 'Karma (GERD + LPR)',
  GERD_DOMINANT: 'Klasik Reflü (GERD) Ağırlıklı',
  LOW_SYMPTOM: 'Düşük Belirti Düzeyi',
};

const INITIAL_REPORT_PATTERN_LIMIT = 20;
const REPORT_PATTERN_STEP = 25;
const INITIAL_RED_FLAG_LIMIT = 15;
const RED_FLAG_STEP = 20;

interface DoctorReportViewProps {
  state: AppPersistedState;
  onOpenPrivacyPolicy?: () => void;
}

export const DoctorReportView = memo(function DoctorReportView({
  state,
  onOpenPrivacyPolicy,
}: DoctorReportViewProps) {
  const { notify } = useToast();
  const { logs, assessments } = state;
  const [patternLimit, setPatternLimit] = useState(INITIAL_REPORT_PATTERN_LIMIT);
  const [redFlagLimit, setRedFlagLimit] = useState(INITIAL_RED_FLAG_LIMIT);

  const latestAssessment: AssessmentRecord | null = assessments[0] ?? null;

  const observedPatterns = useMemo(
    () =>
      computePersonalPatterns(logs).filter(
        (p) => p.meetsMinSample && p.symptomOccurrences > 0
      ),
    [logs]
  );

  const visiblePatterns = useMemo(
    () => observedPatterns.slice(0, patternLimit),
    [observedPatterns, patternLimit]
  );

  const sleepGap = useMemo(() => computeSleepGapComparison(logs), [logs]);

  // Single-pass O(N) aggregation for symptom breakdown, red flags, and min/max date range
  const { symptomBreakdown, redFlagLogs, dateRangeLabel } = useMemo(() => {
    if (logs.length === 0) {
      return {
        symptomBreakdown: [] as {
          code: SymptomCode;
          meta: (typeof SYMPTOM_CATALOG)[SymptomCode];
          count: number;
          avgSeverity: string;
        }[],
        redFlagLogs: [] as RefluxLogEntry[],
        dateRangeLabel: 'Kayıt aralığı yok',
      };
    }

    const symMap = new Map<
      SymptomCode,
      { count: number; totalSeverity: number }
    >();
    const flagged: RefluxLogEntry[] = [];
    let minDate = logs[0].dateStr;
    let maxDate = logs[0].dateStr;

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      if (log.dateStr < minDate) minDate = log.dateStr;
      if (log.dateStr > maxDate) maxDate = log.dateStr;
      if (log.redFlag?.hasRedFlag) flagged.push(log);

      for (let j = 0; j < log.symptoms.length; j++) {
        const s = log.symptoms[j];
        const cur = symMap.get(s.code);
        if (cur) {
          cur.count += 1;
          cur.totalSeverity += s.severity;
        } else {
          symMap.set(s.code, { count: 1, totalSeverity: s.severity });
        }
      }
    }

    const breakdown = Array.from(symMap.entries())
      .map(([code, data]) => ({
        code,
        meta: SYMPTOM_CATALOG[code],
        count: data.count,
        avgSeverity: (data.totalSeverity / data.count).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count);

    return {
      symptomBreakdown: breakdown,
      redFlagLogs: flagged,
      dateRangeLabel: `${minDate} — ${maxDate}`,
    };
  }, [logs]);

  const visibleRedFlags = useMemo(
    () => redFlagLogs.slice(0, redFlagLimit),
    [redFlagLogs, redFlagLimit]
  );

  const todayDisplay = useMemo(() => getTodayLocalDateStr(), []);

  const handlePrint = useCallback(() => {
    notify({
      title: 'Yazdırma penceresi açılıyor',
      description: 'Raporu A4 olarak yazdırabilir veya PDF kaydedebilirsiniz.',
      variant: 'info',
    });
    window.print();
  }, [notify]);

  const handleShowMorePatterns = useCallback(() => {
    setPatternLimit((prev) => prev + REPORT_PATTERN_STEP);
  }, []);

  const handleShowMoreRedFlags = useCallback(() => {
    setRedFlagLimit((prev) => prev + RED_FLAG_STEP);
  }, []);

  return (
    <div className="space-y-6">
      {/* Screen-only action bar */}
      <PageHeader
        className="no-print"
        kicker="Tek Sayfalık A4 Yazdırılabilir Kişisel Gözlem Özeti"
        title="Doktor Raporu"
        actions={
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-2 min-h-11 px-5 py-2.5 rounded-lg bg-[#1D6FD6] text-white text-sm font-medium hover:bg-[#1659B3] whitespace-nowrap cursor-pointer w-full sm:w-auto"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            A4 Yazdır / PDF Kaydet
          </button>
        }
      />

      {/* Screen-only privacy policy & unencrypted local JSON backup control */}
      <DataBackupNotice
        state={state}
        onOpenPrivacyPolicy={onOpenPrivacyPolicy}
      />

      {/* PRINTABLE A4 SHEET */}
      <article
        aria-label="Kişisel gözlem özeti"
        className="print-report-sheet bg-white border border-[#DCE7F3] rounded-2xl p-4 sm:p-6 lg:p-8 space-y-6"
      >
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b-2 border-[#0F233A]">
          <div>
            <p className="text-xs font-semibold text-[#155CC0]">
              ReflüRehber · Kişisel Günlük Gözlem Özeti
            </p>
            <h2 className="text-xl font-bold text-[#0F233A] mt-0.5">
              Kişisel Öğün ve Belirti Takip Özeti
            </h2>
          </div>
          <div className="text-xs text-[#455D75] font-mono tabular-nums sm:text-right space-y-0.5">
            <p>Rapor Tarihi: {todayDisplay}</p>
            <p>Kayıt Aralığı: {dateRangeLabel}</p>
            <p>Toplam Günlük Kaydı: {logs.length}</p>
          </div>
        </header>

        {/* 1. Clinical Screening Scores */}
        <section className="space-y-2.5">
          <h3 className="text-xs font-bold text-[#0F233A] tracking-wide">
            1. Standart Tarama Puanları (RSI &amp; Haftalık GERD)
          </h3>
          {latestAssessment ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F7FBFF] border border-[#DCE7F3]">
                <p className="text-[#688099]">Son RSI Puanı (LPR)</p>
                <p className="font-mono tabular-nums text-lg font-bold text-[#0F233A] mt-1">
                  {latestAssessment.rsiTotal} / 45
                </p>
                <p className="text-[#455D75] mt-0.5">
                  Tarih: {latestAssessment.dateStr} · Eşik: &gt;13
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F7FBFF] border border-[#DCE7F3]">
                <p className="text-[#688099]">Haftalık GERD Sıklık Yükü</p>
                <p className="font-mono tabular-nums text-lg font-bold text-[#0F233A] mt-1">
                  {latestAssessment.gerdqBurdenScore} / 18
                </p>
                <p className="text-[#455D75] mt-0.5">
                  Yutma güçlüğü (RSI #4): {latestAssessment.rsiSwallowingScore}/5
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F7FBFF] border border-[#DCE7F3]">
                <p className="text-[#688099]">Baskın Semptom Ekseni</p>
                <p className="text-sm font-semibold text-[#0F233A] mt-1.5">
                  {PROFILE_LABELS[latestAssessment.profileType]}
                </p>
                <p className="text-[#455D75] mt-0.5">
                  Toplam tarama sayısı: {assessments.length}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#688099]">
              Henüz tamamlanmış RSI / GERD taraması bulunmamaktadır.
            </p>
          )}
        </section>

        {/* 2. GERD vs LPR Symptom Breakdown & Sleep Interval */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="space-y-2.5">
            <h3 className="text-xs font-bold text-[#0F233A]">
              2. GERD ve LPR Belirti Dağılımı (Hasta Günlüğü)
            </h3>
            {symptomBreakdown.length === 0 ? (
              <p className="text-xs text-[#688099]">
                Günlükte kayıtlı belirti bulunmamaktadır.
              </p>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#C6D9ED] text-[#688099]">
                    <th className="py-1.5 pr-2 font-medium">Belirti</th>
                    <th className="py-1.5 px-2 font-medium">Eksen</th>
                    <th className="py-1.5 px-2 font-medium text-right">Sıklık</th>
                    <th className="py-1.5 pl-2 font-medium text-right">Ort. Şiddet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EFF8]">
                  {symptomBreakdown.map((row) => (
                    <tr key={row.code}>
                      <td className="py-1.5 pr-2 text-[#0F233A] font-medium">
                        {row.meta.shortLabel}
                      </td>
                      <td className="py-1.5 px-2 text-[#455D75]">
                        {row.meta.axis}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono tabular-nums text-[#0F233A]">
                        {row.count}
                      </td>
                      <td className="py-1.5 pl-2 text-right font-mono tabular-nums text-[#0F233A]">
                        {row.avgSeverity} / 5
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </section>

          <section className="space-y-2.5">
            <h3 className="text-xs font-bold text-[#0F233A]">
              3. Ortalama Yemek–Uyku Aralığı
            </h3>
            <div className="p-4 rounded-xl bg-[#F7FBFF] border border-[#DCE7F3] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#455D75]">Ortalama aralık:</span>
                <span className="font-mono tabular-nums font-semibold text-[#0F233A]">
                  {sleepGap.avgMealToSleepMinutes !== null
                    ? `${Math.floor(sleepGap.avgMealToSleepMinutes / 60)} sa ${
                        sleepGap.avgMealToSleepMinutes % 60
                      } dk`
                    : 'Kayıt yok'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#455D75]">
                  &lt; 3 saat yatış ({sleepGap.shortGapCount} gece):
                </span>
                <span className="font-mono tabular-nums font-semibold text-[#B91C1C]">
                  {sleepGap.shortGapSymptomRate !== null
                    ? `%${sleepGap.shortGapSymptomRate} belirti (Ort: ${sleepGap.shortGapAvgSeverity}/5)`
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#455D75]">
                  ≥ 3 saat yatış ({sleepGap.safeGapCount} gece):
                </span>
                <span className="font-mono tabular-nums font-semibold text-[#047857]">
                  {sleepGap.safeGapSymptomRate !== null
                    ? `%${sleepGap.safeGapSymptomRate} belirti (Ort: ${sleepGap.safeGapAvgSeverity}/5)`
                    : '—'}
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* 4. Observed Personal Triggers (Strict X/Y Ratios) */}
        <section className="space-y-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-xs font-bold text-[#0F233A]">
              4. Gözlemlenen Kişisel Tetikleyici Örüntüleri (Hasta Tarafından Bildirilen Gözlemler)
            </h3>
            <span className="text-[11px] text-[#688099]">
              Yalnızca ≥{MIN_SAMPLE_SIZE} kayıt içeren örüntüler listelenir
            </span>
          </div>

          {observedPatterns.length === 0 ? (
            <p className="text-xs text-[#688099]">
              Minimum örneklem eşiğini (≥{MIN_SAMPLE_SIZE} kayıt) karşılayan tetikleyici örüntüsü henüz oluşmamıştır.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#C6D9ED] text-[#688099]">
                    <th className="py-1.5 pr-3 font-medium">Etken / Besin</th>
                    <th className="py-1.5 px-3 font-medium text-right">
                      Belirtili / Toplam Gün
                    </th>
                    <th className="py-1.5 pl-3 font-medium text-right">Oran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EFF8]">
                  {visiblePatterns.map((p) => (
                    <tr key={p.id}>
                      <td className="py-1.5 pr-3 font-medium text-[#0F233A]">
                        {p.label}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono tabular-nums text-[#455D75]">
                        {p.symptomOccurrences} / {p.totalOccurrences}
                      </td>
                      <td className="py-1.5 pl-3 text-right font-mono tabular-nums font-semibold text-[#0F233A]">
                        %{p.ratioPercent}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              {observedPatterns.length > patternLimit && (
                <button
                  type="button"
                  onClick={handleShowMorePatterns}
                  className="no-print text-xs font-medium text-[#155CC0] hover:underline cursor-pointer"
                >
                  Daha fazla örüntü göster ({observedPatterns.length - patternLimit} kaldı)
                </button>
              )}
            </>
          )}
        </section>

        {/* 5. Logged Red Flag Events */}
        <section className="space-y-2">
          <h3 className="text-xs font-bold text-[#0F233A]">
            5. Kaydedilen Kırmızı Bayrak (Alarm Belirtisi) Olayları
          </h3>
          {redFlagLogs.length === 0 ? (
            <p className="text-xs text-[#455D75]">
              Kayıtlı kırmızı bayrak (alarm belirtisi) olayı bulunmamaktadır.
            </p>
          ) : (
            <>
              <ul className="space-y-2">
                {visibleRedFlags.map((log: RefluxLogEntry) => (
                  <li
                    key={log.id}
                    className="p-3 rounded-lg bg-[#FEF2F2] border border-[#991B1B] text-xs space-y-1"
                  >
                    <p className="font-semibold text-[#991B1B] font-mono tabular-nums">
                      {log.dateStr} · {log.timeHHMM} —{' '}
                      {log.redFlag?.signals.map((s) => s.label).join(', ')}
                    </p>
                    <p className="text-[#0F233A]">{log.rawText}</p>
                  </li>
                ))}
              </ul>
              {redFlagLogs.length > redFlagLimit && (
                <button
                  type="button"
                  onClick={handleShowMoreRedFlags}
                  className="no-print text-xs font-medium text-[#155CC0] hover:underline cursor-pointer"
                >
                  Daha fazla alarm olayı göster ({redFlagLogs.length - redFlagLimit} kaldı)
                </button>
              )}
            </>
          )}
        </section>

        {/* Mandatory Non-Diagnostic Personal Summary Footer */}
        <footer className="pt-4 border-t border-[#C6D9ED] text-[11px] text-[#455D75] leading-relaxed">
          <p className="font-medium text-[#0F233A]">
            Bu özet tıbbi tavsiye, tanı veya yönlendirme içermez; yalnızca sizin ReflüRehber uygulamasına kaydettiğiniz kişisel günlük notlarının düzenli dökümüdür.
          </p>
        </footer>
      </article>
    </div>
  );
});
