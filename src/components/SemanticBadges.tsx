import { memo } from 'react';
import { AlertTriangle, PhoneCall } from 'lucide-react';
import { CONSENSUS_LABELS } from '../data/foodDatabase';
import type { ConsensusLevel, RedFlagDetectionResult } from '../types/reflux';

const CONSENSUS_STYLES: Record<ConsensusLevel, string> = {
  generally_tolerated: 'bg-[#ECFDF5] text-[#047857]',
  individual_varies: 'bg-[#FFFBEB] text-[#B45309]',
  common_trigger: 'bg-[#FEF2F2] text-[#B91C1C]',
};

export const ConsensusBadge = memo(function ConsensusBadge({
  status,
  consensusLevel,
}: {
  status: 'VERIFIED' | 'UNVERIFIED_CUSTOM';
  consensusLevel?: ConsensusLevel;
}) {
  if (status === 'UNVERIFIED_CUSTOM' || !consensusLevel) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#F1F5F9] text-[#475569] whitespace-nowrap">
        Doğrulanmış listede yok — kişisel gözlem
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${CONSENSUS_STYLES[consensusLevel]}`}
    >
      {CONSENSUS_LABELS[consensusLevel]}
    </span>
  );
});

export const RedFlagAlertBanner = memo(function RedFlagAlertBanner({
  result,
  compact = false,
}: {
  result: RedFlagDetectionResult;
  compact?: boolean;
}) {
  if (!result.hasRedFlag) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`rounded-xl bg-[#991B1B] text-white ${compact ? 'p-4' : 'p-4 sm:p-6'}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {result.urgency === 'EMERGENCY' ? (
            <PhoneCall className="w-5 h-5 text-white" aria-hidden="true" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-white" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="text-base font-semibold tracking-tight text-white">
            {result.headline}
          </h3>
          <p className="text-sm leading-relaxed text-red-50">{result.guidance}</p>
          <div className="pt-1 border-t border-white/20">
            <p className="text-xs font-medium text-red-100 mb-1.5">
              Tespit edilen alarm belirtisi:
            </p>
            <ul className="space-y-1 text-xs text-white">
              {result.signals.map((sig) => (
                <li key={sig.id} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold">{sig.label}</span>
                  <span className="text-red-200 font-mono break-all">
                    (İfade: &ldquo;{sig.matchedPhrase}&rdquo;)
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-red-100 pt-1">
            Bu uygulama tıbbi tavsiye sunmaz; bu tür belirtiler kişisel beslenme günlüğünün kapsamı dışındadır. Kaydı yalnızca kendi notunuz olarak saklayabilirsiniz.
          </p>
        </div>
      </div>
    </div>
  );
});
