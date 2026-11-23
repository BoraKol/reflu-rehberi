import { memo, useCallback } from 'react';
import { Download, ShieldCheck } from 'lucide-react';
import type { AppPersistedState } from '../types/reflux';
import { exportStateAsJson } from '../utils/storage';
import { useToast } from './ToastProvider';

interface DataBackupNoticeProps {
  state: AppPersistedState;
  onOpenPrivacyPolicy?: () => void;
}

export const DataBackupNotice = memo(function DataBackupNotice({
  state,
  onOpenPrivacyPolicy,
}: DataBackupNoticeProps) {
  const { notify } = useToast();
  const logCount = state.logs.length;
  const assessmentCount = state.assessments.length;

  const handleDownload = useCallback(() => {
    const filename = exportStateAsJson(state);
    notify({
      title: 'Şifrelenmemiş JSON yedeği indirildi',
      description: `${filename} bilgisayarınıza kaydedildi. Dosya düz metin olduğundan güvenli bir yerde saklamanız önerilir.`,
      variant: 'success',
      durationMs: 5200,
    });
  }, [state, notify]);

  return (
    <aside
      aria-label="Veri gizliliği politikası ve yerel JSON yedekleme"
      className="no-print bg-[#F7FBFF] border border-[#DCE7F3] rounded-xl px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-[#EBF4FF] text-[#1D6FD6] flex items-center justify-center shrink-0 mt-0.5">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold text-[#0F233A]">
            Veri Gizliliği Politikası ile Uyumlu Yerel Yedekleme
          </p>
          <p className="text-xs text-[#455D75] leading-relaxed">
            Bu indirme aracı, uygulamanın{' '}
            {onOpenPrivacyPolicy ? (
              <button
                type="button"
                onClick={onOpenPrivacyPolicy}
                className="font-semibold text-[#155CC0] underline underline-offset-2 hover:text-[#1D6FD6] cursor-pointer"
              >
                veri gizliliği politikası
              </button>
            ) : (
              <span className="font-medium text-[#0F233A]">
                veri gizliliği politikası
              </span>
            )}{' '}
            ile tam uyumlu şekilde tasarlanmıştır: sağlık verileriniz hiçbir şekilde uygulama içinde veya tarayıcınızda saklanmaz. Tüm kayıtlarınızı ({logCount} günlük kaydı, {assessmentCount} değerlendirme) bilgisayarınıza yerel olarak{' '}
            <span className="font-medium text-[#0F233A]">
              şifrelenmemiş JSON dosyası
            </span>{' '}
            halinde indirebilirsiniz; indirdiğiniz dosyayı yalnızca güvendiğiniz cihazda saklamanız önerilir.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDownload}
        className="inline-flex items-center justify-center gap-2 min-h-10 px-4 py-2 rounded-lg border border-[#C6D9ED] bg-white text-xs font-semibold text-[#155CC0] hover:bg-[#EBF4FF] transition-colors whitespace-nowrap shrink-0 self-start sm:self-center cursor-pointer"
      >
        <Download className="w-4 h-4 text-[#1D6FD6]" aria-hidden="true" />
        Verimi İndir
      </button>
    </aside>
  );
});
