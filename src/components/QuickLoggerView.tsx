import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Camera, CheckCircle2, Loader2, X } from 'lucide-react';
import {
  buildLogSaveFeedback,
  type LogSaveFeedback,
} from '../engine/engagementEngine';
import { detectRedFlags } from '../engine/redFlagGuard';
import { matchFoodItem } from '../engine/triggerEngine';
import { createId } from '../lib/id';
import {
  formatClockHHMM,
  getTodayLocalDateStr,
  isValidHHMM,
} from '../lib/time';
import { parseNaturalLanguageEntry } from '../services/geminiParser';
import {
  SYMPTOM_CATALOG,
  type ActiveTab,
  type LoggedFoodItem,
  type LoggedSymptom,
  type RedFlagDetectionResult,
  type RefluxLogEntry,
  type SymptomCode,
} from '../types/reflux';
import type { AuthModalMode } from './AuthModal';
import { RedFlagAlertBanner } from './SemanticBadges';
import { useToast } from './ToastProvider';
import { LogDraftEditor } from './logger/LogDraftEditor';
import { LogHistoryList } from './logger/LogHistoryList';
import { PageHeader } from './ui/PageHeader';

interface QuickLoggerViewProps {
  logs: RefluxLogEntry[];
  onSaveLog: (entry: RefluxLogEntry) => void | Promise<void>;
  onDeleteLog: (id: string) => void | Promise<void>;
  canSave: boolean;
  isDemoPreview: boolean;
  onOpenAuth: (mode?: AuthModalMode) => void;
  initialPromptText?: string | null;
  onConsumePromptText?: () => void;
  onNavigate?: (tab: ActiveTab) => void;
}

interface QuickShortcut {
  label: string;
  kind: 'FOOD' | 'SYMPTOM' | 'LATE_MEAL';
  foodRaw?: string;
  symptomCode?: SymptomCode;
}

const TURKISH_SHORTCUTS: readonly QuickShortcut[] = [
  { label: 'Demli Çay', kind: 'FOOD', foodRaw: 'Demli Siyah Çay' },
  { label: 'Salçalı Yemek', kind: 'FOOD', foodRaw: 'Domates Salçası' },
  { label: 'Türk Kahvesi', kind: 'FOOD', foodRaw: 'Türk Kahvesi' },
  { label: 'Poğaça', kind: 'FOOD', foodRaw: 'Poğaça' },
  { label: 'Geç Öğün (21:30)', kind: 'LATE_MEAL' },
  { label: 'Boğazda Gıcık', kind: 'SYMPTOM', symptomCode: 'THROAT_IRRITATION' },
  { label: 'Ses Kısıklığı', kind: 'SYMPTOM', symptomCode: 'HOARSENESS' },
  { label: 'Boğaz Temizleme', kind: 'SYMPTOM', symptomCode: 'THROAT_CLEARING' },
  { label: 'Mide Yanması', kind: 'SYMPTOM', symptomCode: 'HEARTBURN' },
  { label: 'Ağza Acı Su', kind: 'SYMPTOM', symptomCode: 'REGURGITATION' },
];

const ALLOWED_PHOTO_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

function computeGapMinutes(mealHHMM: string, bedtimeHHMM: string): number | undefined {
  if (!isValidHHMM(mealHHMM) || !isValidHHMM(bedtimeHHMM)) return undefined;
  const [mh, mm] = mealHHMM.split(':').map(Number);
  const [bh, bm] = bedtimeHHMM.split(':').map(Number);
  const mealMins = mh * 60 + mm;
  let bedMins = bh * 60 + bm;
  if (bedMins < mealMins) bedMins += 24 * 60;
  const diff = bedMins - mealMins;
  return diff >= 0 && diff <= 12 * 60 ? diff : undefined;
}

export const QuickLoggerView = memo(function QuickLoggerView({
  logs,
  onSaveLog,
  onDeleteLog,
  canSave,
  isDemoPreview,
  onOpenAuth,
  initialPromptText,
  onConsumePromptText,
  onNavigate,
}: QuickLoggerViewProps) {
  const { notify } = useToast();
  const [rawText, setRawText] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [draftOpen, setDraftOpen] = useState(false);
  const [draftSource, setDraftSource] = useState<'gemini' | 'manual'>('manual');
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [draftFoods, setDraftFoods] = useState<LoggedFoodItem[]>([]);
  const [draftSymptoms, setDraftSymptoms] = useState<LoggedSymptom[]>([]);
  const [draftDate, setDraftDate] = useState<string>(() => getTodayLocalDateStr());
  const [draftTime, setDraftTime] = useState<string>(() => formatClockHHMM(Date.now()));
  const [draftBedtime, setDraftBedtime] = useState('');
  const [draftIsLateMeal, setDraftIsLateMeal] = useState(false);
  const [draftNotes, setDraftNotes] = useState('');
  const [manualFoodInput, setManualFoodInput] = useState('');
  const [selectedSymptomToAdd, setSelectedSymptomToAdd] =
    useState<SymptomCode>('THROAT_IRRITATION');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [lastSaveFeedback, setLastSaveFeedback] = useState<LogSaveFeedback | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const parseAbortRef = useRef<AbortController | null>(null);

  // Clean up object URL on change/unmount (prevents memory leaks on mobile browsers)
  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  // Abort any in-flight parse request on unmount
  useEffect(() => {
    return () => {
      parseAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!initialPromptText) return;
    setRawText(initialPromptText);
    onConsumePromptText?.();
    const timer = window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 60);
    return () => window.clearTimeout(timer);
  }, [initialPromptText, onConsumePromptText]);

  const liveRedFlag: RedFlagDetectionResult = useMemo(
    () => detectRedFlags(rawText),
    [rawText]
  );

  const handlePhotoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!ALLOWED_PHOTO_MIMES.has(file.type)) {
        notify({
          title: 'Desteklenmeyen format',
          description: 'Lütfen JPEG, PNG veya WebP görseli seçin.',
          variant: 'warning',
        });
        return;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        notify({
          title: 'Dosya çok büyük',
          description: 'Lütfen 15 MB altında bir fotoğraf seçin.',
          variant: 'warning',
        });
        return;
      }
      setPhotoFile(file);
      setPhotoPreviewUrl(URL.createObjectURL(file));
      setValidationError(null);
      notify({
        title: 'Fotoğraf eklendi',
        description: 'Önizle düğmesine basarak öğündeki besinleri çıkarabilirsiniz.',
        variant: 'info',
      });
    },
    [notify]
  );

  const clearPhoto = useCallback(
    (silent = false) => {
      setPhotoFile(null);
      setPhotoPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (!silent) notify({ title: 'Fotoğraf kaldırıldı', variant: 'info' });
    },
    [notify]
  );

  const handleParse = useCallback(
    async (forceOffline: boolean) => {
      setValidationError(null);

      if (!rawText.trim() && !photoFile) {
        const msg =
          'Lütfen ne yediğinizi veya hissettiğiniz belirtiyi yazın, fotoğraf ekleyin ya da aşağıdaki hızlı kısayollardan birini seçin.';
        setValidationError(msg);
        notify({ title: 'Eksik bilgi', description: msg, variant: 'warning' });
        return;
      }

      parseAbortRef.current?.abort();
      const controller = new AbortController();
      parseAbortRef.current = controller;

      setIsParsing(true);
      try {
        const parsed = await parseNaturalLanguageEntry({
          text: rawText,
          imageFile: forceOffline ? null : photoFile,
          forceOffline,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        setDraftSource(parsed.source);
        setFallbackNotice(parsed.fallbackNotice ?? null);

        setDraftFoods((prev) => {
          const merged = [...prev];
          for (const item of parsed.foods) {
            const exists = merged.some(
              (m) =>
                (item.matchedFoodId && m.matchedFoodId === item.matchedFoodId) ||
                m.rawName.toLowerCase() === item.rawName.toLowerCase()
            );
            if (!exists) merged.push(item);
          }
          return merged;
        });

        setDraftSymptoms((prev) => {
          const merged = [...prev];
          for (const sym of parsed.symptoms) {
            if (!merged.some((m) => m.code === sym.code)) merged.push(sym);
          }
          return merged;
        });

        if (parsed.timeHHMM) {
          setDraftTime(parsed.timeHHMM);
          const hr = Number(parsed.timeHHMM.split(':')[0]);
          if (hr >= 21 || hr < 4) setDraftIsLateMeal(true);
        }
        setDraftNotes(parsed.notesSummary);
        setDraftOpen(true);
      } catch (err) {
        if (!controller.signal.aborted && err instanceof Error) {
          notify({
            title: 'Görsel işlenemedi',
            description: err.message,
            variant: 'warning',
          });
        }
      } finally {
        if (parseAbortRef.current === controller) {
          setIsParsing(false);
        }
      }
    },
    [rawText, photoFile, notify]
  );

  const handleShortcutTap = useCallback((shortcut: QuickShortcut) => {
    setValidationError(null);
    setDraftOpen(true);

    if (shortcut.kind === 'FOOD' && shortcut.foodRaw) {
      const matched = matchFoodItem(shortcut.foodRaw);
      setDraftFoods((prev) =>
        prev.some((f) => f.matchedFoodId === matched.matchedFoodId && matched.matchedFoodId)
          ? prev
          : [...prev, matched]
      );
    } else if (shortcut.kind === 'SYMPTOM' && shortcut.symptomCode) {
      const code = shortcut.symptomCode;
      setDraftSymptoms((prev) =>
        prev.some((s) => s.code === code) ? prev : [...prev, { code, severity: 3 }]
      );
    } else if (shortcut.kind === 'LATE_MEAL') {
      setDraftTime('21:30');
      setDraftIsLateMeal(true);
    }
  }, []);

  const handleAddManualFood = useCallback(() => {
    const val = manualFoodInput.trim();
    if (!val) return;
    setDraftFoods((prev) => [...prev, matchFoodItem(val)]);
    setManualFoodInput('');
    setDraftOpen(true);
    setValidationError(null);
  }, [manualFoodInput]);

  const handleRemoveFood = useCallback((idx: number) => {
    setDraftFoods((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleAddManualSymptom = useCallback(() => {
    setDraftSymptoms((prev) =>
      prev.some((s) => s.code === selectedSymptomToAdd)
        ? prev
        : [...prev, { code: selectedSymptomToAdd, severity: 3 }]
    );
    setDraftOpen(true);
    setValidationError(null);
  }, [selectedSymptomToAdd]);

  const handleUpdateSymptomSeverity = useCallback((code: SymptomCode, severity: number) => {
    setDraftSymptoms((prev) =>
      prev.map((s) => (s.code === code ? { ...s, severity } : s))
    );
  }, []);

  const handleRemoveSymptom = useCallback((code: SymptomCode) => {
    setDraftSymptoms((prev) => prev.filter((s) => s.code !== code));
  }, []);

  const handleCancelDraft = useCallback(() => {
    setDraftOpen(false);
    setDraftFoods([]);
    setDraftSymptoms([]);
  }, []);

  const handleConfirmSave = useCallback(async () => {
    if (isSaving) return;
    setValidationError(null);

    if (!canSave) {
      onOpenAuth('login');
      return;
    }

    if (
      draftFoods.length === 0 &&
      draftSymptoms.length === 0 &&
      !liveRedFlag.hasRedFlag &&
      !rawText.trim()
    ) {
      const msg = 'Kaydetmek için en az bir besin, belirti veya gözlem notu ekleyin.';
      setValidationError(msg);
      notify({ title: 'Kayıt boş', description: msg, variant: 'warning' });
      return;
    }

    const gapMins = draftBedtime ? computeGapMinutes(draftTime, draftBedtime) : undefined;
    const hourNum = Number(draftTime.split(':')[0]);
    const isLate = draftIsLateMeal || hourNum >= 21 || hourNum < 4;

    const autoText =
      rawText.trim() ||
      [
        draftFoods.length > 0
          ? `Besin: ${draftFoods.map((f) => f.matchedFoodName ?? f.rawName).join(', ')}`
          : '',
        draftSymptoms.length > 0
          ? `Belirti: ${draftSymptoms
              .map((s) => `${SYMPTOM_CATALOG[s.code].shortLabel} (${s.severity}/5)`)
              .join(', ')}`
          : '',
      ]
        .filter(Boolean)
        .join(' · ');

    const newEntry: RefluxLogEntry = {
      id: createId('log'),
      timestamp: `${draftDate}T${draftTime}:00`,
      dateStr: draftDate,
      timeHHMM: draftTime,
      rawText: autoText,
      foods: draftFoods,
      symptoms: draftSymptoms,
      bedtimeHHMM: draftBedtime || undefined,
      mealToSleepMinutes: gapMins,
      isLateMeal: isLate && draftFoods.length > 0,
      redFlag: liveRedFlag.hasRedFlag ? liveRedFlag : undefined,
      source: draftSource,
      notesSummary: draftNotes || undefined,
    };

    setIsSaving(true);
    try {
      await onSaveLog(newEntry);
    } catch {
      return;
    } finally {
      setIsSaving(false);
    }

    const hadFlag = liveRedFlag.hasRedFlag;
    setRawText('');
    clearPhoto(true);
    setDraftFoods([]);
    setDraftSymptoms([]);
    setDraftBedtime('');
    setDraftIsLateMeal(false);
    setDraftNotes('');
    setFallbackNotice(null);
    setDraftOpen(false);

    if (hadFlag) {
      setLastSaveFeedback(null);
      notify({
        title: 'Önemli belirti notu kaydedildi',
        description:
          'Bu tür belirtiler kişisel günlük takibinin kapsamı dışındadır; sağlık değerlendirmesi için bir sağlık kuruluşuna başvurabilirsiniz.',
        variant: 'error',
        durationMs: 6500,
        browserAlert: true,
        tag: 'reflu-red-flag',
      });
    } else {
      const feedback = buildLogSaveFeedback(
        newEntry,
        [newEntry, ...logs],
        getTodayLocalDateStr()
      );
      setLastSaveFeedback(feedback);
      notify({
        title: isDemoPreview ? `${feedback.title} (Önizleme)` : feedback.title,
        description: feedback.detail,
        variant: 'success',
      });
    }
  }, [
    isSaving,
    canSave,
    onOpenAuth,
    draftFoods,
    draftSymptoms,
    liveRedFlag,
    rawText,
    draftBedtime,
    draftTime,
    draftIsLateMeal,
    draftDate,
    draftSource,
    draftNotes,
    onSaveLog,
    clearPhoto,
    notify,
    logs,
    isDemoPreview,
  ]);

  return (
    <div className="space-y-6 sm:space-y-7">
      <PageHeader kicker="Öğün ve Belirti Günlüğü" title="Hızlı Kayıt" />

      {liveRedFlag.hasRedFlag && <RedFlagAlertBanner result={liveRedFlag} />}

      {lastSaveFeedback && (
        <section
          data-testid="log-save-feedback"
          aria-live="polite"
          className="bg-[#F0F7FF] border border-[#BBD6F7] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white border border-[#CBE0FA] text-[#047857] flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-[#0F233A]">
                  {lastSaveFeedback.title}
                </span>
                <span aria-hidden="true" className="text-[#8BA0B5]">·</span>
                <span className="font-mono tabular-nums font-medium text-[#155CC0]">
                  {lastSaveFeedback.badgeText}
                </span>
              </div>
              <p className="text-xs text-[#455D75] leading-relaxed">
                {lastSaveFeedback.detail}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {lastSaveFeedback.showDetectiveCta && onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('detective')}
                className="inline-flex items-center gap-1.5 min-h-9 px-3 py-1.5 rounded-lg bg-[#1D6FD6] text-white text-xs font-medium hover:bg-[#1659B3] whitespace-nowrap cursor-pointer"
              >
                Dedektifte Gör
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setLastSaveFeedback(null)}
              aria-label="Geri bildirim kartını kapat"
              className="p-2 rounded-lg text-[#455D75] hover:text-[#0F233A] hover:bg-white cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      {/* Main Input Surface */}
      <section className="bg-white border border-[#DCE7F3] rounded-2xl p-4 sm:p-6 space-y-5">
        <div className="space-y-2">
          <label
            htmlFor="quick-log-textarea"
            className="block text-sm font-medium text-[#0F233A]"
          >
            Ne yedin veya bugün nasıl hissettin?
          </label>
          <textarea
            ref={textareaRef}
            id="quick-log-textarea"
            rows={3}
            maxLength={2000}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Örn: Saat 21:30 gibi salçalı makarna ve demli çay içtim, 1 saat sonra boğazda gıcık ve hafif ses kısıklığı başladı..."
            className="w-full rounded-xl border border-[#C6D9ED] bg-white px-3.5 sm:px-4 py-3 text-base sm:text-sm text-[#0F233A] placeholder:text-[#8BA0B5] focus:outline-none focus:border-[#1D6FD6] focus:ring-2 focus:ring-[#1D6FD6]/15 leading-relaxed"
          />
        </div>

        {photoPreviewUrl && (
          <div className="flex items-center gap-3 sm:gap-4 p-3 rounded-xl bg-[#F4F8FC] border border-[#DCE7F3]">
            <img
              src={photoPreviewUrl}
              alt="Yüklenen öğün fotoğrafı önizlemesi"
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-lg object-cover border border-[#DCE7F3] shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#0F233A] truncate">
                {photoFile?.name}
              </p>
              <p className="text-xs text-[#688099]">
                Fotoğraftaki besinler yalnızca yapılandırılmış liste çıkarmak için taranır.
              </p>
            </div>
            <button
              type="button"
              onClick={() => clearPhoto(false)}
              aria-label="Fotoğrafı kaldır"
              className="p-2 rounded-md text-[#455D75] hover:text-[#0F233A] hover:bg-[#DCE7F3] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              className="hidden"
              id="meal-photo-upload"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 min-h-10 px-3.5 py-2 rounded-lg border border-[#DCE7F3] bg-white text-xs font-medium text-[#0F233A] hover:bg-[#F4F8FC] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Camera className="w-4 h-4 text-[#1D6FD6]" aria-hidden="true" />
              Fotoğraf Ekle
            </button>
            <button
              type="button"
              onClick={() => handleParse(true)}
              disabled={isParsing}
              className="min-h-10 px-3.5 py-2 rounded-lg border border-[#DCE7F3] bg-white text-xs font-medium text-[#0F233A] hover:bg-[#F4F8FC] transition-colors whitespace-nowrap disabled:opacity-50 cursor-pointer"
            >
              Hızlı Çözümle
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleParse(false)}
            disabled={isParsing}
            className="inline-flex items-center justify-center gap-2 min-h-11 px-5 py-2.5 rounded-lg bg-[#1D6FD6] text-white text-sm font-medium hover:bg-[#1659B3] transition-colors whitespace-nowrap disabled:opacity-60 cursor-pointer"
          >
            {isParsing && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {isParsing ? 'Hazırlanıyor...' : 'Önizle'}
          </button>
        </div>

        <div className="pt-4 border-t border-[#E6EFF8] space-y-2.5">
          <p className="text-xs font-medium text-[#455D75]">
            2 saniyede hızlı kısayollar (yazmadan ekle):
          </p>
          <div className="flex flex-wrap gap-2">
            {TURKISH_SHORTCUTS.map((sc) => (
              <button
                key={sc.label}
                type="button"
                onClick={() => handleShortcutTap(sc)}
                className="min-h-9 px-3 py-1.5 rounded-lg border border-[#DCE7F3] bg-[#F7FBFF] text-xs font-medium text-[#0F233A] hover:border-[#1D6FD6] hover:text-[#155CC0] hover:bg-[#EBF4FF] transition-colors whitespace-nowrap cursor-pointer touch-manipulation"
              >
                + {sc.label}
              </button>
            ))}
          </div>
        </div>

        {validationError && (
          <p role="alert" className="text-xs font-medium text-[#B91C1C]">
            {validationError}
          </p>
        )}
      </section>

      {(draftOpen || liveRedFlag.hasRedFlag) && (
        <LogDraftEditor
          logs={logs}
          hasRedFlag={liveRedFlag.hasRedFlag}
          fallbackNotice={fallbackNotice}
          draftDate={draftDate}
          draftTime={draftTime}
          draftBedtime={draftBedtime}
          draftFoods={draftFoods}
          draftSymptoms={draftSymptoms}
          manualFoodInput={manualFoodInput}
          selectedSymptomToAdd={selectedSymptomToAdd}
          canSave={canSave}
          isSaving={isSaving}
          onChangeDate={setDraftDate}
          onChangeTime={setDraftTime}
          onChangeBedtime={setDraftBedtime}
          onChangeManualFood={setManualFoodInput}
          onAddManualFood={handleAddManualFood}
          onRemoveFood={handleRemoveFood}
          onChangeSelectedSymptom={setSelectedSymptomToAdd}
          onAddManualSymptom={handleAddManualSymptom}
          onUpdateSymptomSeverity={handleUpdateSymptomSeverity}
          onRemoveSymptom={handleRemoveSymptom}
          onCancel={handleCancelDraft}
          onConfirmSave={handleConfirmSave}
        />
      )}

      <LogHistoryList
        logs={logs}
        isDemoPreview={isDemoPreview}
        onDeleteLog={onDeleteLog}
      />
    </div>
  );
});
