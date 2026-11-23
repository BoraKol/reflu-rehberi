import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { createDemoAssessments, createDemoLogs } from '../data/demoData';
import { sortByTimestampDesc } from '../lib/time';
import {
  firestoreHealthRepository,
  type HealthDataRepository,
} from '../services/firestoreService';
import type {
  AppPersistedState,
  AssessmentRecord,
  RefluxLogEntry,
  SleepShieldState,
} from '../types/reflux';
import { DEFAULT_STATE } from '../utils/storage';
import type { ToastInput } from '../components/ToastProvider';
import type { AuthModalMode } from '../components/AuthModal';

interface UseHealthDataOptions {
  user: User | null;
  emailVerified: boolean;
  notify: (toast: ToastInput) => void;
  openAuthModal: (mode?: AuthModalMode) => void;
  repository?: HealthDataRepository;
}

/**
 * Application state coordinator for personal health data & ephemeral demo preview.
 * Depends on the `HealthDataRepository` abstraction (DIP) rather than concrete SDK calls.
 * Never persists health data to browser storage.
 */
export function useHealthData({
  user,
  emailVerified,
  notify,
  openAuthModal,
  repository = firestoreHealthRepository,
}: UseHealthDataOptions) {
  const [cloudState, setCloudState] = useState<AppPersistedState>(DEFAULT_STATE);
  const [isDemoPreview, setIsDemoPreview] = useState(false);
  const [demoState, setDemoState] = useState<AppPersistedState>(DEFAULT_STATE);

  const isVerifiedUser = Boolean(user && emailVerified);

  useEffect(() => {
    if (!user || !emailVerified) return;
    let active = true;

    void repository.ensureUserSettings(user.uid).catch(() => {
      if (active) {
        notify({
          title: 'Bağlantı hatası',
          description: 'Hesap verileriniz yüklenirken bağlantı sorunu oluştu.',
          variant: 'error',
        });
      }
    });

    const unsub = repository.subscribe(user.uid, {
      onSettings: (sleepShield) => {
        if (active) setCloudState((prev) => ({ ...prev, sleepShield }));
      },
      onLogs: (logs) => {
        if (active) setCloudState((prev) => ({ ...prev, logs }));
      },
      onAssessments: (assessments) => {
        if (active) setCloudState((prev) => ({ ...prev, assessments }));
      },
      onError: () => {
        if (active) {
          notify({
            title: 'Veri erişim hatası',
            description: 'Kişisel kayıtlarınıza erişilirken bir sorun oluştu.',
            variant: 'error',
          });
        }
      },
    });

    return () => {
      active = false;
      unsub();
    };
  }, [user, emailVerified, notify, repository]);

  const resetAllData = useCallback(() => {
    setCloudState(DEFAULT_STATE);
    setDemoState(DEFAULT_STATE);
    setIsDemoPreview(false);
  }, []);

  const exitDemoPreview = useCallback(() => {
    setIsDemoPreview(false);
  }, []);

  const toggleDemoPreview = useCallback(() => {
    if (isDemoPreview) {
      setIsDemoPreview(false);
      setDemoState(DEFAULT_STATE);
      notify({ title: 'Örnek önizleme kapatıldı', variant: 'info' });
    } else {
      setDemoState({
        logs: sortByTimestampDesc(createDemoLogs()),
        assessments: sortByTimestampDesc(createDemoAssessments()),
        sleepShield: { lastMealTimestamp: null, windowHours: 3 },
        isDemoLoaded: true,
      });
      setIsDemoPreview(true);
      notify({
        title: '14 günlük örnek veri yüklendi',
        description: 'Geçici önizleme aktif — tarayıcıda saklanmaz.',
        variant: 'info',
      });
    }
  }, [isDemoPreview, notify]);

  const saveLog = useCallback(
    async (entry: RefluxLogEntry) => {
      if (isDemoPreview) {
        setDemoState((prev) => ({
          ...prev,
          logs: sortByTimestampDesc([entry, ...prev.logs]),
        }));
        return;
      }
      if (!user) {
        openAuthModal('login');
        return;
      }
      if (!emailVerified) {
        notify({
          title: 'E-posta doğrulaması gerekiyor',
          description: 'Kaydınızı saklamak için önce e-posta adresinizi doğrulayın.',
          variant: 'warning',
        });
        return;
      }
      try {
        await repository.createLog(user.uid, entry);
      } catch {
        notify({
          title: 'Kayıt eklenemedi',
          description: 'Bağlantınızı kontrol edip tekrar deneyin.',
          variant: 'error',
        });
        throw new Error('save_failed');
      }
    },
    [isDemoPreview, user, emailVerified, openAuthModal, notify, repository]
  );

  const deleteLog = useCallback(
    async (id: string) => {
      if (isDemoPreview) {
        setDemoState((prev) => ({
          ...prev,
          logs: prev.logs.filter((l) => l.id !== id),
        }));
        notify({ title: 'Kayıt silindi', variant: 'info' });
        return;
      }
      if (!user || !emailVerified) return;
      try {
        await repository.deleteLog(user.uid, id);
        notify({ title: 'Kayıt silindi', variant: 'info' });
      } catch {
        notify({
          title: 'Kayıt silinemedi',
          description: 'Lütfen tekrar deneyin.',
          variant: 'error',
        });
      }
    },
    [isDemoPreview, user, emailVerified, notify, repository]
  );

  const saveAssessment = useCallback(
    async (record: AssessmentRecord) => {
      if (isDemoPreview) {
        setDemoState((prev) => ({
          ...prev,
          assessments: [record, ...prev.assessments],
        }));
        return;
      }
      if (!user) {
        openAuthModal('login');
        return;
      }
      if (!emailVerified) {
        notify({
          title: 'E-posta doğrulaması gerekiyor',
          description: 'Değerlendirme sonucunu kaydetmek için e-posta adresinizi doğrulayın.',
          variant: 'warning',
        });
        return;
      }
      try {
        await repository.createAssessment(user.uid, record);
      } catch {
        notify({
          title: 'Değerlendirme kaydedilemedi',
          description: 'Lütfen tekrar deneyin.',
          variant: 'error',
        });
        throw new Error('save_failed');
      }
    },
    [isDemoPreview, user, emailVerified, openAuthModal, notify, repository]
  );

  const updateSleepShield = useCallback(
    (next: SleepShieldState) => {
      if (isDemoPreview || !isVerifiedUser || !user) {
        setDemoState((prev) => ({ ...prev, sleepShield: next }));
        return;
      }
      setCloudState((prev) => ({ ...prev, sleepShield: next }));
      void repository.saveSleepShield(user.uid, next).catch(() => {
        notify({
          title: 'Senkronizasyon hatası',
          description: 'Yemek–Uyku Kalkanı güncellenemedi.',
          variant: 'error',
        });
      });
    },
    [isDemoPreview, isVerifiedUser, user, notify, repository]
  );

  const effectiveState: AppPersistedState = useMemo(() => {
    if (isDemoPreview) return demoState;
    if (isVerifiedUser) return cloudState;
    return { ...DEFAULT_STATE, sleepShield: demoState.sleepShield };
  }, [isDemoPreview, demoState, isVerifiedUser, cloudState]);

  return {
    effectiveState,
    isDemoPreview,
    canSavePersonal: isVerifiedUser || isDemoPreview,
    resetAllData,
    exitDemoPreview,
    toggleDemoPreview,
    saveLog,
    deleteLog,
    saveAssessment,
    updateSleepShield,
  };
}
