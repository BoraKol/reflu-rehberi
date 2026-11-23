import { memo } from 'react';
import { Database, Lock, LogIn, MailCheck, RefreshCw, ShieldCheck, UserPlus } from 'lucide-react';
import type { AuthModalMode } from './AuthModal';

interface AuthGateCardProps {
  title?: string;
  description?: string;
  onOpenAuth: (mode?: AuthModalMode) => void;
  onToggleDemo?: () => void;
  onOpenPrivacyPolicy?: () => void;
  isDemoPreview?: boolean;
  compact?: boolean;
}

export const AuthGateCard = memo(function AuthGateCard({
  title = 'Kişisel Sağlık Verileriniz Yalnızca Hesabınıza Özeldir',
  description = 'Öğün, belirti ve test kayıtlarınız tarayıcıda tutulmaz; yalnızca hesabınıza özel güvenli alanda saklanır ve başka kimse erişemez.',
  onOpenAuth,
  onToggleDemo,
  onOpenPrivacyPolicy,
  isDemoPreview = false,
  compact = false,
}: AuthGateCardProps) {
  if (compact) {
    return (
      <section
        aria-label="Gizlilik ve hesap durumu"
        className="bg-[#F0F7FF] border border-[#CBE0FA] rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-white border border-[#CBE0FA] flex items-center justify-center shrink-0 mt-0.5">
            <Lock className="w-4 h-4 text-[#1D6FD6]" aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-semibold text-[#0F233A]">
              {isDemoPreview
                ? 'Geçici Örnek Veri Önizlemesi'
                : 'Verileriniz Yalnızca Hesabınıza Özeldir'}
            </p>
            <p className="text-xs text-[#455D75] leading-relaxed">
              {isDemoPreview
                ? 'Şu an 14 günlük örnek veriyi inceliyorsunuz. Kendi kayıtlarınızı güvenle saklamak için üst menüden e-posta veya Google ile giriş yapabilirsiniz.'
                : 'Sağlık kayıtlarınız tarayıcıda bırakılmaz. Üst menüden e-posta/şifre veya Google hesabınızla güvenle devam edebilirsiniz.'}
              {onOpenPrivacyPolicy && (
                <>
                  {' '}
                  <button
                    type="button"
                    onClick={onOpenPrivacyPolicy}
                    className="font-medium text-[#155CC0] underline underline-offset-2 hover:text-[#1D6FD6] cursor-pointer"
                  >
                    Gizlilik Politikası
                  </button>
                </>
              )}
            </p>
          </div>
        </div>

        {onToggleDemo && (
          <div className="sm:hidden shrink-0">
            <button
              type="button"
              onClick={onToggleDemo}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#CBE0FA] bg-white text-xs font-medium text-[#155CC0] hover:bg-[#E8F2FE] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" aria-hidden="true" />
              {isDemoPreview ? 'Önizlemeyi Kapat' : '14 Günlük Örnek Önizle'}
            </button>
          </div>
        )}
      </section>
    );
  }

  return (
    <section
      aria-labelledby="auth-gate-heading"
      className="bg-white border border-[#DCE7F3] rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto space-y-6"
    >
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-[#EBF4FF] flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-[#1D6FD6]" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h2
            id="auth-gate-heading"
            className="text-lg sm:text-xl font-semibold tracking-tight text-[#0F233A]"
          >
            {title}
          </h2>
          <p className="text-sm text-[#455D75] leading-relaxed">{description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#E6EFF8] text-xs">
        <div className="p-3.5 rounded-xl bg-[#F7FBFF] border border-[#E2EEF9] space-y-1">
          <p className="font-semibold text-[#0F233A]">Tarayıcıda Saklanmaz</p>
          <p className="text-[#455D75] leading-relaxed">
            Ortak veya kişisel cihazlarda geride sağlık verisi bırakılmaz.
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-[#F7FBFF] border border-[#E2EEF9] space-y-1">
          <p className="font-semibold text-[#0F233A]">Size Özel Erişim</p>
          <p className="text-[#455D75] leading-relaxed">
            E-posta/şifre veya Google hesabınızla yalnızca size açık kayıtlar.
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-[#F7FBFF] border border-[#E2EEF9] space-y-1">
          <p className="font-semibold text-[#0F233A]">Çıkışta Anında Temizlik</p>
          <p className="text-[#455D75] leading-relaxed">
            Oturum kapandığında ekrandaki tüm veriler anında kapatılır.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onOpenAuth('login')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1D6FD6] text-white text-sm font-medium hover:bg-[#1659B3] transition-colors whitespace-nowrap cursor-pointer"
        >
          <LogIn className="w-4 h-4" aria-hidden="true" />
          Giriş Yap
        </button>

        <button
          type="button"
          onClick={() => onOpenAuth('register')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#BBD6F7] bg-[#F0F7FF] text-sm font-medium text-[#155CC0] hover:bg-[#E2EEF9] transition-colors whitespace-nowrap cursor-pointer"
        >
          <UserPlus className="w-4 h-4" aria-hidden="true" />
          E-posta ile Kaydol
        </button>

        {onToggleDemo && (
          <button
            type="button"
            onClick={onToggleDemo}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#DCE7F3] bg-white text-sm font-medium text-[#0F233A] hover:bg-[#F4F8FC] transition-colors whitespace-nowrap cursor-pointer"
          >
            <Database className="w-4 h-4 text-[#1D6FD6]" aria-hidden="true" />
            {isDemoPreview
              ? 'Geçici Önizlemeyi Kapat'
              : '14 Günlük Örnek Veriyi Geçici Önizle'}
          </button>
        )}
      </div>
    </section>
  );
});

export const EmailVerificationBanner = memo(function EmailVerificationBanner({
  email,
  checking,
  resending,
  onCheckVerified,
  onResend,
}: {
  email: string | null;
  checking: boolean;
  resending: boolean;
  onCheckVerified: () => void;
  onResend: () => void;
}) {
  return (
    <section
      aria-label="E-posta doğrulama bildirimi"
      className="bg-[#F0F7FF] border border-[#BBD6F7] rounded-xl px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-white border border-[#CBE0FA] flex items-center justify-center shrink-0 mt-0.5">
          <MailCheck className="w-4 h-4 text-[#1D6FD6]" aria-hidden="true" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-semibold text-[#0F233A]">
            E-posta Doğrulaması Bekleniyor
          </p>
          <p className="text-xs text-[#455D75] leading-relaxed">
            {email ? `${email} adresine` : 'E-posta adresinize'} gönderilen doğrulama bağlantısına tıkladıktan sonra kişisel kayıtlarınızı güvenle saklayabilirsiniz.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onResend}
          disabled={resending}
          className="px-3.5 py-2 rounded-lg border border-[#CBE0FA] bg-white text-xs font-medium text-[#155CC0] hover:bg-[#E8F2FE] disabled:opacity-60 whitespace-nowrap cursor-pointer"
        >
          {resending ? 'Gönderiliyor...' : 'Bağlantıyı Tekrar Gönder'}
        </button>
        <button
          type="button"
          onClick={onCheckVerified}
          disabled={checking}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1D6FD6] text-white text-xs font-medium hover:bg-[#1659B3] disabled:opacity-60 whitespace-nowrap cursor-pointer"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          {checking ? 'Kontrol ediliyor...' : 'Doğruladım, Devam Et'}
        </button>
      </div>
    </section>
  );
});
