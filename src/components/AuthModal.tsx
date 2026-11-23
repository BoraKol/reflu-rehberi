import { memo, useCallback, useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail, User as UserIcon, X } from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useModalBehavior } from '../hooks/useModalBehavior';
import { useToast } from './ToastProvider';

export type AuthModalMode = 'login' | 'register' | 'reset';

interface AuthModalProps {
  open: boolean;
  initialMode?: AuthModalMode;
  onClose: () => void;
  onOpenPrivacyPolicy?: () => void;
}

function mapFirebaseAuthError(err: unknown, mode: AuthModalMode): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code)
      : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'E-posta adresi veya şifre hatalı.';
    case 'auth/invalid-email':
      return 'Lütfen geçerli bir e-posta adresi girin.';
    case 'auth/email-already-in-use':
      return 'Kayıt işlemi tamamlanamadı. Bu e-posta adresi zaten kullanımda olabilir; giriş yapmayı veya şifre sıfırlamayı deneyebilirsiniz.';
    case 'auth/weak-password':
      return 'Şifreniz en az 8 karakter uzunluğunda olmalıdır.';
    case 'auth/too-many-requests':
      return 'Çok fazla deneme yapıldı. Lütfen biraz bekleyip tekrar deneyin.';
    case 'auth/operation-not-allowed':
      return 'E-posta ve şifre ile giriş şu an kullanılamıyor. Lütfen Google ile devam edin.';
    case 'auth/popup-closed-by-user':
      return 'Google giriş penceresi kapatıldı.';
    case 'auth/popup-blocked':
      return 'Tarayıcı açılır pencereyi engelledi. Lütfen açılır pencerelere izin verip tekrar deneyin.';
    case 'auth/network-request-failed':
      return 'Ağ bağlantısı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.';
    default:
      if (mode === 'reset') {
        return 'Şifre sıfırlama isteği gönderilemedi. Lütfen tekrar deneyin.';
      }
      return 'İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.';
  }
}

export const AuthModal = memo(function AuthModal({
  open,
  initialMode = 'login',
  onClose,
  onOpenPrivacyPolicy,
}: AuthModalProps) {
  const { notify } = useToast();
  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const busy = submitting || googleLoading;
  const handleSafeClose = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);

  useModalBehavior(open, handleSafeClose);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setFormError(null);
      setPassword('');
      setConfirmPassword('');
    }
  }, [open, initialMode]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setFormError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      const msg = 'Lütfen geçerli bir e-posta adresi girin.';
      setFormError(msg);
      notify({ title: 'Geçersiz e-posta', description: msg, variant: 'warning' });
      return;
    }

    if (mode === 'reset') {
      setSubmitting(true);
      try {
        await sendPasswordResetEmail(auth, trimmedEmail);
        notify({
          title: 'Şifre sıfırlama e-postası gönderildi',
          description:
            'Bu e-posta adresine kayıtlı bir hesap varsa gelen kutunuzda sıfırlama bağlantısını bulabilirsiniz.',
          variant: 'info',
        });
        setMode('login');
      } catch (err) {
        const msg = mapFirebaseAuthError(err, 'reset');
        setFormError(msg);
        notify({ title: 'İstek gönderilemedi', description: msg, variant: 'error' });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (password.length < 8) {
      const msg = 'Şifre en az 8 karakter olmalıdır.';
      setFormError(msg);
      notify({ title: 'Şifre çok kısa', description: msg, variant: 'warning' });
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      const msg = 'Girdiğiniz şifreler birbiriyle eşleşmiyor.';
      setFormError(msg);
      notify({ title: 'Şifreler uyuşmuyor', description: msg, variant: 'warning' });
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'register') {
        const cred = await createUserWithEmailAndPassword(
          auth,
          trimmedEmail,
          password
        );
        const cleanName = displayName.trim().slice(0, 60);
        if (cleanName) {
          await updateProfile(cred.user, { displayName: cleanName }).catch(
            () => {}
          );
        }
        await sendEmailVerification(cred.user).catch(() => {});
        notify({
          title: 'Hesabınız oluşturuldu',
          description:
            'Güvenliğiniz için e-posta adresinize doğrulama bağlantısı gönderdik. Doğruladıktan sonra tüm verileriniz hesabınızda saklanır.',
          variant: 'success',
          durationMs: 6000,
        });
        onClose();
      } else {
        const cred = await signInWithEmailAndPassword(
          auth,
          trimmedEmail,
          password
        );
        if (cred.user.emailVerified) {
          notify({
            title: 'Hoş geldiniz',
            description: 'Kişisel takip alanınız açıldı.',
            variant: 'success',
          });
        } else {
          notify({
            title: 'E-posta doğrulaması gerekiyor',
            description:
              'Kayıtlarınıza erişmek için e-postanızdaki doğrulama bağlantısına tıklayın.',
            variant: 'info',
          });
        }
        onClose();
      }
    } catch (err) {
      const msg = mapFirebaseAuthError(err, mode);
      setFormError(msg);
      notify({
        title: mode === 'register' ? 'Kayıt tamamlanamadı' : 'Giriş yapılamadı',
        description: msg,
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (busy) return;
    setFormError(null);
    setGoogleLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      notify({
        title: 'Google hesabıyla giriş yapıldı',
        description: 'Kişisel verileriniz yalnızca hesabınıza özel alanda tutulur.',
        variant: 'success',
      });
      onClose();
    } catch (err) {
      const msg = mapFirebaseAuthError(err, 'login');
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      setFormError(msg);
      notify({
        title:
          code === 'auth/popup-closed-by-user'
            ? 'Giriş iptal edildi'
            : 'Google ile giriş yapılamadı',
        description: msg,
        variant: code === 'auth/popup-closed-by-user' ? 'warning' : 'error',
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F233A]/35 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="w-full max-w-[440px] max-h-[92dvh] flex flex-col rounded-2xl bg-white border border-[#DCE7F3] shadow-[0_24px_60px_-16px_rgba(15,35,58,0.22)] overflow-hidden">
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 flex items-start justify-between gap-4 border-b border-[#E6EFF8] shrink-0">
          <div className="space-y-1">
            <h2
              id="auth-modal-title"
              className="text-lg font-semibold tracking-tight text-[#0F233A]"
            >
              {mode === 'login'
                ? 'Hesabınıza Giriş Yapın'
                : mode === 'register'
                  ? 'Yeni Hesap Oluşturun'
                  : 'Şifrenizi Sıfırlayın'}
            </h2>
            <p className="text-xs text-[#455D75] leading-relaxed">
              {mode === 'reset'
                ? 'Kayıtlı e-posta adresinizi girin, sıfırlama bağlantısı gönderelim.'
                : 'Google hesabınızı paylaşmadan yalnızca e-posta ve şifre ile de devam edebilirsiniz.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Pencereyi kapat"
            className="p-1.5 rounded-lg text-[#688099] hover:text-[#0F233A] hover:bg-[#F4F8FC] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Mode Segmented Switcher */}
          {mode !== 'reset' && (
            <div
              role="tablist"
              aria-label="Hesap işlem türü"
              className="grid grid-cols-2 gap-1 p-1 bg-[#F0F6FC] border border-[#E2EEF9] rounded-xl"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => {
                  setMode('login');
                  setFormError(null);
                }}
                className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white text-[#155CC0] shadow-xs'
                    : 'text-[#455D75] hover:text-[#0F233A]'
                }`}
              >
                Giriş Yap
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                onClick={() => {
                  setMode('register');
                  setFormError(null);
                }}
                className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white text-[#155CC0] shadow-xs'
                    : 'text-[#455D75] hover:text-[#0F233A]'
                }`}
              >
                E-posta ile Kaydol
              </button>
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            {mode === 'register' && (
              <div className="space-y-1">
                <label
                  htmlFor="auth-display-name"
                  className="block text-xs font-medium text-[#455D75]"
                >
                  Ad veya Takma Ad (isteğe bağlı)
                </label>
                <div className="relative">
                  <UserIcon
                    className="w-4 h-4 text-[#8BA0B5] absolute left-3.5 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-display-name"
                    type="text"
                    maxLength={60}
                    autoComplete="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Örn: Deniz"
                    className="w-full min-h-11 pl-10 pr-3.5 py-2.5 rounded-lg border border-[#C6D9ED] text-base sm:text-sm text-[#0F233A] placeholder:text-[#8BA0B5] focus:outline-none focus:border-[#1D6FD6] focus:ring-2 focus:ring-[#1D6FD6]/15"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label
                htmlFor="auth-email"
                className="block text-xs font-medium text-[#455D75]"
              >
                E-posta Adresi
              </label>
              <div className="relative">
                <Mail
                  className="w-4 h-4 text-[#8BA0B5] absolute left-3.5 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  id="auth-email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@eposta.com"
                  className="w-full min-h-11 pl-10 pr-3.5 py-2.5 rounded-lg border border-[#C6D9ED] text-base sm:text-sm text-[#0F233A] placeholder:text-[#8BA0B5] focus:outline-none focus:border-[#1D6FD6] focus:ring-2 focus:ring-[#1D6FD6]/15"
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="auth-password"
                    className="block text-xs font-medium text-[#455D75]"
                  >
                    Şifre
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('reset');
                        setFormError(null);
                      }}
                      className="text-xs font-medium text-[#155CC0] hover:underline cursor-pointer"
                    >
                      Şifremi unuttum
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock
                    className="w-4 h-4 text-[#8BA0B5] absolute left-3.5 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete={
                      mode === 'register' ? 'new-password' : 'current-password'
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="En az 8 karakter"
                    className="w-full min-h-11 pl-10 pr-10 py-2.5 rounded-lg border border-[#C6D9ED] text-base sm:text-sm text-[#0F233A] placeholder:text-[#8BA0B5] focus:outline-none focus:border-[#1D6FD6] focus:ring-2 focus:ring-[#1D6FD6]/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-[#688099] hover:text-[#0F233A] cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div className="space-y-1">
                <label
                  htmlFor="auth-confirm-password"
                  className="block text-xs font-medium text-[#455D75]"
                >
                  Şifre Tekrar
                </label>
                <div className="relative">
                  <Lock
                    className="w-4 h-4 text-[#8BA0B5] absolute left-3.5 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Şifrenizi tekrar girin"
                    className="w-full min-h-11 pl-10 pr-3.5 py-2.5 rounded-lg border border-[#C6D9ED] text-base sm:text-sm text-[#0F233A] placeholder:text-[#8BA0B5] focus:outline-none focus:border-[#1D6FD6] focus:ring-2 focus:ring-[#1D6FD6]/15"
                  />
                </div>
              </div>
            )}

            {formError && (
              <p
                role="alert"
                className="text-xs font-medium text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3 py-2"
              >
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1D6FD6] text-white text-sm font-medium hover:bg-[#1659B3] transition-colors disabled:opacity-60 cursor-pointer"
            >
              {submitting && (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              )}
              {mode === 'login'
                ? 'E-posta ile Giriş Yap'
                : mode === 'register'
                  ? 'Hesap Oluştur'
                  : 'Sıfırlama Bağlantısı Gönder'}
            </button>

            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setFormError(null);
                }}
                className="w-full py-2 text-xs font-medium text-[#455D75] hover:text-[#0F233A] cursor-pointer"
              >
                Giriş ekranına dön
              </button>
            )}
          </form>

          {/* Divider + Google Sign-In Option */}
          {mode !== 'reset' && (
            <>
              <div className="relative flex items-center justify-center">
                <div className="w-full border-t border-[#E6EFF8]" />
                <span className="bg-white px-3 text-[11px] font-medium text-[#688099] shrink-0">
                  veya
                </span>
                <div className="w-full border-t border-[#E6EFF8]" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg border border-[#DCE7F3] bg-white text-sm font-medium text-[#0F233A] hover:bg-[#F7FBFF] hover:border-[#BBD6F7] transition-colors disabled:opacity-60 cursor-pointer"
              >
                {googleLoading ? (
                  <Loader2
                    className="w-4 h-4 animate-spin text-[#1D6FD6]"
                    aria-hidden="true"
                  />
                ) : (
                  <svg
                    className="w-4 h-4 shrink-0"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fill="#4285F4"
                      d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3.01h3.88c2.27-2.09 3.54-5.17 3.54-8.88z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.88-3.01c-1.07.72-2.45 1.15-4.05 1.15-3.12 0-5.77-2.11-6.72-4.95H1.27v3.11A12 12 0 0 0 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.38-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4.01-3.11z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4.01 3.11c.95-2.84 3.6-4.95 6.72-4.95z"
                    />
                  </svg>
                )}
                Google ile Devam Et
              </button>
            </>
          )}

          <p className="text-[11px] text-center text-[#688099] leading-relaxed">
            Sağlık verileriniz tarayıcıda tutulmaz; yalnızca kendi hesabınızla erişilebilir.
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
    </div>
  );
});
