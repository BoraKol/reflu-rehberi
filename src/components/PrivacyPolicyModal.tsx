import { memo } from 'react';
import {
  Download,
  HardDrive,
  Lock,
  Server,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useModalBehavior } from '../hooks/useModalBehavior';

interface PrivacyPolicyModalProps {
  open: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal = memo(function PrivacyPolicyModal({
  open,
  onClose,
}: PrivacyPolicyModalProps) {
  useModalBehavior(open, onClose);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-policy-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F233A]/35 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[580px] max-h-[90dvh] flex flex-col rounded-2xl bg-white border border-[#DCE7F3] shadow-[0_24px_60px_-16px_rgba(15,35,58,0.22)] overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 flex items-start justify-between gap-4 border-b border-[#E6EFF8] shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#EBF4FF] text-[#1D6FD6] flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="space-y-0.5">
              <h2
                id="privacy-policy-title"
                className="text-lg font-semibold tracking-tight text-[#0F233A]"
              >
                Gizlilik Politikası
              </h2>
              <p className="text-xs text-[#455D75] leading-relaxed">
                ReflüRehber&apos;de veri gizliliği, yerel depolama ve sunucu koruma ilkeleri
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Gizlilik politikasını kapat"
            className="p-1.5 rounded-lg text-[#688099] hover:text-[#0F233A] hover:bg-[#F4F8FC] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 overflow-y-auto">
          <section className="p-4 rounded-xl bg-[#F7FBFF] border border-[#DCE7F3] space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0F233A]">
              <Lock className="w-4 h-4 text-[#1D6FD6] shrink-0" aria-hidden="true" />
              <h3>1. Veri Gizliliği ve Sahiplik</h3>
            </div>
            <p className="text-xs text-[#455D75] leading-relaxed">
              Kaydettiğiniz öğünler, belirtiler, değerlendirme puanları ve yemek–uyku aralıkları yalnızca sizin kişisel takibiniz ve hekim görüşmelerinize hazırlık içindir. Sağlık verileriniz üçüncü taraflarla paylaşılmaz, reklam veya profilleme amacıyla kullanılmaz.
            </p>
          </section>

          <section className="p-4 rounded-xl bg-[#F7FBFF] border border-[#DCE7F3] space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0F233A]">
              <HardDrive className="w-4 h-4 text-[#1D6FD6] shrink-0" aria-hidden="true" />
              <h3>2. Yerel Depolama İlkeleri (Tarayıcıda Sıfır Sağlık Verisi)</h3>
            </div>
            <p className="text-xs text-[#455D75] leading-relaxed">
              ReflüRehber kişisel sağlık kayıtlarınızı tarayıcının yerel depolama alanlarında saklamaz. Ortak veya kişisel bir cihazda oturumu kapattığınızda ekrandaki tüm veriler anında bellekten temizlenir. 14 günlük örnek önizleme verisi de yalnızca geçici olarak bellekte tutulur ve sayfa kapatıldığında silinir.
            </p>
          </section>

          <section className="p-4 rounded-xl bg-[#F7FBFF] border border-[#DCE7F3] space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0F233A]">
              <Server className="w-4 h-4 text-[#1D6FD6] shrink-0" aria-hidden="true" />
              <h3>3. Sunucuda Koruma ve Hesap İzolasyonu</h3>
            </div>
            <p className="text-xs text-[#455D75] leading-relaxed">
              Hesabınızla giriş yaptığınızda verileriniz şifreli bağlantı (HTTPS/TLS) üzerinden iletilir ve sunucuda yalnızca kendi kullanıcı kimliğinize özel izole bir alanda korunur. Sunucu tarafı güvenlik kuralları, oturum doğrulaması yapılmadan veya farklı bir hesapla kayıtlarınıza erişilmesini engeller. E-posta/şifre ile açılan hesaplarda bulut erişimi e-posta doğrulaması tamamlandıktan sonra etkinleşir.
            </p>
          </section>

          <section className="p-4 rounded-xl bg-[#F7FBFF] border border-[#DCE7F3] space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0F233A]">
              <Download className="w-4 h-4 text-[#1D6FD6] shrink-0" aria-hidden="true" />
              <h3>4. Yerel JSON Yedekleme ve Kontrolünüz</h3>
            </div>
            <p className="text-xs text-[#455D75] leading-relaxed">
              <strong>Analizler</strong> ve <strong>Doktor Raporu</strong> bölümlerindeki <strong>Verimi İndir</strong> butonuyla tüm kayıtlarınızı doğrudan bilgisayarınıza <strong>şifrelenmemiş (düz metin) JSON dosyası</strong> olarak yedekleyebilirsiniz. İndirilen dosya cihazınızda düz metin olarak saklandığından yalnızca güvendiğiniz cihazda tutmanız önerilir. Dilediğiniz kaydı uygulama içinden istediğiniz an silebilirsiniz.
            </p>
          </section>

          <p className="text-[11px] text-[#688099] leading-relaxed pt-1">
            Not: ReflüRehber tıbbi teşhis veya tedavi sunmaz; tüm kayıtlar kullanıcının kendi gözlemlerine dayanır.
          </p>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 bg-[#F7FBFF] border-t border-[#E6EFF8] flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 px-5 py-2 rounded-lg bg-[#1D6FD6] text-white text-xs font-medium hover:bg-[#1659B3] transition-colors cursor-pointer"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  );
});
