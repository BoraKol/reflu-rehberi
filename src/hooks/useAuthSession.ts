import { useCallback, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  sendEmailVerification,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from '../firebase';
import { resetFirestoreSessionCache } from '../services/firestoreService';
import { purgeLegacyBrowserStorage } from '../utils/storage';
import type { ToastInput } from '../components/ToastProvider';

interface UseAuthSessionOptions {
  notify: (toast: ToastInput) => void;
  onResetHealthData: () => void;
  onVerifiedLogin: () => void;
}

export function useAuthSession({
  notify,
  onResetHealthData,
  onVerifiedLogin,
}: UseAuthSessionOptions) {
  const [user, setUser] = useState<User | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);

  // One-time startup purge of any legacy browser storage health data
  useEffect(() => {
    purgeLegacyBrowserStorage();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setEmailVerified(Boolean(nextUser?.emailVerified));
      setAuthReady(true);
      if (!nextUser) {
        resetFirestoreSessionCache();
        onResetHealthData();
        purgeLegacyBrowserStorage();
      } else if (nextUser.emailVerified) {
        onVerifiedLogin();
      }
    });
    return unsub;
  }, [onResetHealthData, onVerifiedLogin]);

  const checkEmailVerified = useCallback(async () => {
    if (!auth.currentUser) return;
    setCheckingVerification(true);
    try {
      await auth.currentUser.reload();
      await auth.currentUser.getIdToken(true);
      if (auth.currentUser.emailVerified) {
        setEmailVerified(true);
        onVerifiedLogin();
        notify({
          title: 'E-posta adresiniz doğrulandı',
          description: 'Artık tüm kayıtlarınız hesabınızda güvenle saklanır.',
          variant: 'success',
        });
      } else {
        notify({
          title: 'Doğrulama henüz tamamlanmadı',
          description:
            'Lütfen e-posta gelen kutunuzdaki (veya gereksiz klasöründeki) bağlantıya tıklayıp tekrar deneyin.',
          variant: 'warning',
        });
      }
    } catch {
      notify({
        title: 'Kontrol edilemedi',
        description: 'Bağlantınızı kontrol edip tekrar deneyin.',
        variant: 'error',
      });
    } finally {
      setCheckingVerification(false);
    }
  }, [notify, onVerifiedLogin]);

  const resendVerification = useCallback(async () => {
    if (!auth.currentUser) return;
    setResendingVerification(true);
    try {
      await sendEmailVerification(auth.currentUser);
      notify({
        title: 'Doğrulama e-postası tekrar gönderildi',
        description: 'Gelen kutunuzu kontrol edin.',
        variant: 'info',
      });
    } catch {
      notify({
        title: 'Gönderilemedi',
        description: 'Kısa bir süre bekleyip tekrar deneyin.',
        variant: 'warning',
      });
    } finally {
      setResendingVerification(false);
    }
  }, [notify]);

  const handleSignOut = useCallback(async () => {
    resetFirestoreSessionCache();
    onResetHealthData();
    setEmailVerified(false);
    purgeLegacyBrowserStorage();
    try {
      await signOut(auth);
      notify({
        title: 'Oturum kapatıldı',
        description: 'Ekrandaki tüm sağlık verileri güvenle temizlendi.',
        variant: 'info',
      });
    } catch {
      notify({
        title: 'Çıkış yapılamadı',
        description: 'Lütfen tekrar deneyin.',
        variant: 'error',
      });
    }
  }, [notify, onResetHealthData]);

  return {
    user,
    emailVerified,
    isVerifiedUser: Boolean(user && emailVerified),
    authReady,
    checkingVerification,
    resendingVerification,
    checkEmailVerified,
    resendVerification,
    handleSignOut,
  };
}
