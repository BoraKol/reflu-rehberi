import { memo } from 'react';
import { Check, LogIn, Plus, X } from 'lucide-react';
import { getFoodPersonalHistory } from '../../engine/correlationEngine';
import {
  SYMPTOM_CATALOG,
  type LoggedFoodItem,
  type LoggedSymptom,
  type RefluxLogEntry,
  type SymptomCode,
} from '../../types/reflux';
import { ConsensusBadge } from '../SemanticBadges';

const SEVERITY_LABELS: Record<number, { label: string; activeClass: string }> = {
  1: { label: 'Çok hafif', activeClass: 'bg-[#10B981] text-white' },
  2: { label: 'Hafif', activeClass: 'bg-[#3B82F6] text-white' },
  3: { label: 'Orta', activeClass: 'bg-[#1D6FD6] text-white' },
  4: { label: 'Belirgin', activeClass: 'bg-[#D97706] text-white' },
  5: { label: 'Yoğun', activeClass: 'bg-[#DC2626] text-white' },
};

const SYMPTOM_META_LIST = Object.values(SYMPTOM_CATALOG);

interface LogDraftEditorProps {
  logs: RefluxLogEntry[];
  hasRedFlag: boolean;
  fallbackNotice: string | null;
  draftDate: string;
  draftTime: string;
  draftBedtime: string;
  draftFoods: LoggedFoodItem[];
  draftSymptoms: LoggedSymptom[];
  manualFoodInput: string;
  selectedSymptomToAdd: SymptomCode;
  canSave: boolean;
  isSaving: boolean;
  onChangeDate: (val: string) => void;
  onChangeTime: (val: string) => void;
  onChangeBedtime: (val: string) => void;
  onChangeManualFood: (val: string) => void;
  onAddManualFood: () => void;
  onRemoveFood: (idx: number) => void;
  onChangeSelectedSymptom: (code: SymptomCode) => void;
  onAddManualSymptom: () => void;
  onUpdateSymptomSeverity: (code: SymptomCode, severity: number) => void;
  onRemoveSymptom: (code: SymptomCode) => void;
  onCancel: () => void;
  onConfirmSave: () => void;
}

export const LogDraftEditor = memo(function LogDraftEditor({
  logs,
  hasRedFlag,
  fallbackNotice,
  draftDate,
  draftTime,
  draftBedtime,
  draftFoods,
  draftSymptoms,
  manualFoodInput,
  selectedSymptomToAdd,
  canSave,
  isSaving,
  onChangeDate,
  onChangeTime,
  onChangeBedtime,
  onChangeManualFood,
  onAddManualFood,
  onRemoveFood,
  onChangeSelectedSymptom,
  onAddManualSymptom,
  onUpdateSymptomSeverity,
  onRemoveSymptom,
  onCancel,
  onConfirmSave,
}: LogDraftEditorProps) {
  return (
    <section
      aria-labelledby="preview-confirm-heading"
      className="bg-[#F7FBFF] border border-[#BBD6F7] rounded-2xl p-4 sm:p-6 space-y-6"
    >
      <div className="pb-4 border-b border-[#DCE7F3]">
        <h2 id="preview-confirm-heading" className="text-base font-semibold text-[#0F233A]">
          Kaydetmeden Önce Kontrol Et
        </h2>
        <p className="text-xs text-[#455D75] mt-0.5">
          Her öğeyi tek dokunuşla düzenleyebilir veya silebilirsiniz.
        </p>
      </div>

      {fallbackNotice && (
        <p className="text-xs text-[#455D75] bg-white border border-[#DCE7F3] rounded-lg px-3.5 py-2.5">
          {fallbackNotice}
        </p>
      )}

      {/* Time & Bedtime Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div>
          <label htmlFor="draft-date" className="block text-xs font-medium text-[#455D75] mb-1">
            Tarih
          </label>
          <input
            id="draft-date"
            type="date"
            value={draftDate}
            onChange={(e) => onChangeDate(e.target.value)}
            className="w-full min-h-10 px-3 py-2 rounded-lg border border-[#C6D9ED] bg-white text-base sm:text-sm font-mono tabular-nums text-[#0F233A]"
          />
        </div>
        <div>
          <label htmlFor="draft-time" className="block text-xs font-medium text-[#455D75] mb-1">
            Öğün / Belirti Saati
          </label>
          <input
            id="draft-time"
            type="time"
            value={draftTime}
            onChange={(e) => onChangeTime(e.target.value)}
            className="w-full min-h-10 px-3 py-2 rounded-lg border border-[#C6D9ED] bg-white text-base sm:text-sm font-mono tabular-nums text-[#0F233A]"
          />
        </div>
        <div>
          <label
            htmlFor="draft-bedtime"
            className="block text-xs font-medium text-[#455D75] mb-1"
          >
            Yatış Saati (isteğe bağlı)
          </label>
          <input
            id="draft-bedtime"
            type="time"
            value={draftBedtime}
            onChange={(e) => onChangeBedtime(e.target.value)}
            className="w-full min-h-10 px-3 py-2 rounded-lg border border-[#C6D9ED] bg-white text-base sm:text-sm font-mono tabular-nums text-[#0F233A]"
          />
        </div>
      </div>

      {/* Extracted Foods */}
      {!hasRedFlag && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#0F233A]">Tespit Edilen Besinler</h3>
            <span className="text-xs text-[#688099]">
              Genel Klinik Kılavuz vs. Kendi Geçmişin
            </span>
          </div>

          {draftFoods.length === 0 ? (
            <p className="text-xs text-[#688099]">
              Henüz besin eklenmedi. Aşağıdan elle ekleyebilirsiniz.
            </p>
          ) : (
            <div className="bg-white divide-y divide-[#E6EFF8] border border-[#DCE7F3] rounded-xl">
              {draftFoods.map((food, idx) => {
                const history = getFoodPersonalHistory(
                  logs,
                  food.matchedFoodId ?? food.rawName,
                  Boolean(food.matchedFoodId)
                );
                return (
                  <div
                    key={`draft-food-${food.matchedFoodId ?? food.rawName}-${idx}`}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-[#0F233A] break-words">
                          {food.matchedFoodName ?? food.rawName}
                        </span>
                        {food.matchedFoodName &&
                          food.matchedFoodName.toLowerCase() !==
                            food.rawName.toLowerCase() && (
                            <span className="text-xs text-[#688099]">
                              (yazılan: &ldquo;{food.rawName}&rdquo;)
                            </span>
                          )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-[#688099]">Genel Kılavuz:</span>
                        <ConsensusBadge
                          status={food.status}
                          consensusLevel={food.consensusLevel}
                        />
                        <span aria-hidden="true" className="text-[#C6D9ED]">|</span>
                        <span className="text-[#688099]">Senin Geçmişin:</span>
                        <span className="font-medium text-[#0F233A] tabular-nums">
                          {history.label}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveFood(idx)}
                      aria-label={`${food.matchedFoodName ?? food.rawName} besinini kaldır`}
                      className="self-end sm:self-center p-2 rounded-md text-[#688099] hover:text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add custom or verified food manually */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <input
              type="text"
              maxLength={120}
              value={manualFoodInput}
              onChange={(e) => onChangeManualFood(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onAddManualFood();
                }
              }}
              placeholder="Başka bir besin ekle (örn: Türk kahvesi veya özel bir ürün)"
              aria-label="Manuel besin ekle"
              className="flex-1 min-h-10 px-3 py-2 rounded-lg border border-[#C6D9ED] bg-white text-base sm:text-xs text-[#0F233A] placeholder:text-[#8BA0B5] focus:outline-none focus:border-[#1D6FD6]"
            />
            <button
              type="button"
              onClick={onAddManualFood}
              className="inline-flex items-center justify-center gap-1 min-h-10 px-3.5 py-2 rounded-lg border border-[#DCE7F3] bg-white text-xs font-medium text-[#0F233A] hover:border-[#1D6FD6] hover:text-[#155CC0] whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Besin Ekle
            </button>
          </div>
        </div>
      )}

      {/* Extracted Symptoms with 1..5 Severity */}
      <div className="space-y-3 pt-2 border-t border-[#DCE7F3]">
        <h3 className="text-sm font-semibold text-[#0F233A]">Belirtiler ve Şiddet (1–5)</h3>

        {draftSymptoms.length === 0 ? (
          <p className="text-xs text-[#688099]">
            Belirti eklenmediyse bu öğün belirtisiz (rahat geçen) kayıt olarak kaydedilir.
          </p>
        ) : (
          <div className="bg-white divide-y divide-[#E6EFF8] border border-[#DCE7F3] rounded-xl">
            {draftSymptoms.map((sym) => {
              const meta = SYMPTOM_CATALOG[sym.code];
              return (
                <div
                  key={sym.code}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-[#0F233A]">{meta.label}</span>
                    <span className="ml-2 text-xs text-[#688099]">
                      · {meta.axis === 'LPR' ? 'Sessiz Reflü (LPR)' : 'Klasik Reflü (GERD)'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-[#455D75] mr-1">
                      Şiddet ({SEVERITY_LABELS[sym.severity]?.label ?? 'Orta'}):
                    </span>
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => onUpdateSymptomSeverity(sym.code, lvl)}
                        aria-label={`${meta.shortLabel} şiddet ${lvl} (${SEVERITY_LABELS[lvl].label})`}
                        aria-pressed={sym.severity === lvl}
                        title={SEVERITY_LABELS[lvl].label}
                        className={`w-9 h-9 sm:w-7 sm:h-7 rounded-md text-xs font-mono tabular-nums font-medium transition-colors cursor-pointer ${
                          sym.severity === lvl
                            ? SEVERITY_LABELS[lvl].activeClass
                            : 'bg-[#F0F6FC] text-[#455D75] hover:bg-[#DCEBFE]'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => onRemoveSymptom(sym.code)}
                      aria-label={`${meta.shortLabel} belirtisini kaldır`}
                      className="ml-1 p-2 rounded-md text-[#688099] hover:text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
          <select
            aria-label="Eklenecek belirti seçin"
            value={selectedSymptomToAdd}
            onChange={(e) => onChangeSelectedSymptom(e.target.value as SymptomCode)}
            className="flex-1 min-w-0 min-h-10 px-3 py-2 rounded-lg border border-[#C6D9ED] bg-white text-base sm:text-xs text-[#0F233A]"
          >
            {SYMPTOM_META_LIST.map((meta) => (
              <option key={meta.code} value={meta.code}>
                {meta.label} ({meta.axis})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onAddManualSymptom}
            className="inline-flex items-center justify-center gap-1 min-h-10 px-3.5 py-2 rounded-lg border border-[#DCE7F3] bg-white text-xs font-medium text-[#0F233A] hover:border-[#1D6FD6] hover:text-[#155CC0] whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            Belirti Ekle
          </button>
        </div>
      </div>

      {/* Final Confirm Actions */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-4 border-t border-[#DCE7F3]">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-10 px-4 py-2 rounded-lg text-xs font-medium text-[#455D75] hover:text-[#0F233A] hover:bg-white cursor-pointer"
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={onConfirmSave}
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 min-h-11 px-5 py-2.5 rounded-lg bg-[#1D6FD6] text-white text-sm font-medium hover:bg-[#1659B3] disabled:opacity-60 transition-colors cursor-pointer"
        >
          {canSave ? (
            <>
              <Check className="w-4 h-4" aria-hidden="true" />
              {isSaving ? 'Kaydediliyor...' : 'Kaydı Onayla ve Kaydet'}
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" aria-hidden="true" />
              Kaydetmek için Giriş Yap
            </>
          )}
        </button>
      </div>
    </section>
  );
});
