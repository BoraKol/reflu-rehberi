import { memo } from 'react';
import { Clock, Lock, Trash2 } from 'lucide-react';
import { SYMPTOM_CATALOG, type RefluxLogEntry } from '../../types/reflux';
import { ConsensusBadge, RedFlagAlertBanner } from '../SemanticBadges';

interface LogHistoryListProps {
  logs: RefluxLogEntry[];
  isDemoPreview: boolean;
  onDeleteLog: (id: string) => void | Promise<void>;
}

export const LogHistoryList = memo(function LogHistoryList({
  logs,
  isDemoPreview,
  onDeleteLog,
}: LogHistoryListProps) {
  return (
    <section className="bg-white border border-[#DCE7F3] rounded-2xl p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E6EFF8]">
        <h2 className="text-base font-semibold text-[#0F233A]">
          Kayıt Geçmişin ({logs.length})
        </h2>
        <span className="inline-flex items-center gap-1.5 text-xs text-[#155CC0]">
          <Lock className="w-3.5 h-3.5" aria-hidden="true" />
          {isDemoPreview ? 'Geçici önizleme' : 'Hesabınızda güvenle saklanır'}
        </span>
      </div>

      {logs.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#688099]">
          Kayıt geçmişiniz boş. Yukarıdan ilk kaydınızı ekleyebilirsiniz.
        </p>
      ) : (
        <ul className="divide-y divide-[#E6EFF8]">
          {logs.slice(0, 15).map((entry) => (
            <li key={entry.id} className="py-4 flex items-start justify-between gap-3 sm:gap-4">
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#455D75] font-mono tabular-nums">
                  <span className="font-medium text-[#0F233A]">{entry.dateStr}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    {entry.timeHHMM}
                  </span>
                  {entry.symptoms.length > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-sans text-[#0F233A]">
                        {entry.symptoms
                          .map(
                            (s) =>
                              `${SYMPTOM_CATALOG[s.code]?.shortLabel} (${s.severity}/5)`
                          )
                          .join(', ')}
                      </span>
                    </>
                  )}
                </div>
                {entry.redFlag?.hasRedFlag && (
                  <RedFlagAlertBanner result={entry.redFlag} compact />
                )}
                <p className="text-sm text-[#0F233A] break-words">{entry.rawText}</p>
                {entry.foods.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {entry.foods.map((f, i) => (
                      <span
                        key={`${entry.id}-food-${i}`}
                        className="inline-flex flex-wrap items-center gap-1.5 text-xs text-[#455D75]"
                      >
                        <span className="font-medium text-[#0F233A]">
                          {f.matchedFoodName ?? f.rawName}
                        </span>
                        <ConsensusBadge
                          status={f.status}
                          consensusLevel={f.consensusLevel}
                        />
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => onDeleteLog(entry.id)}
                aria-label={`${entry.dateStr} ${entry.timeHHMM} kaydını sil`}
                className="p-2.5 rounded-md text-[#8BA0B5] hover:text-[#B91C1C] hover:bg-[#FEF2F2] shrink-0 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
});
