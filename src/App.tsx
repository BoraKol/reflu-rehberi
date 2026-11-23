import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { DashboardView } from './components/DashboardView';
import { AuthGateCard, EmailVerificationBanner } from './components/AuthGateCard';
import type { AuthModalMode } from './components/AuthModal';
import { LandingPage } from './components/landing/LandingPage';
import { useToast } from './components/ToastProvider';
import { AppHeader } from './components/layout/AppHeader';
import { AppSidebar } from './components/layout/AppSidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { ViewFallback } from './components/layout/ViewFallback';
import { getNavItem } from './components/layout/navigation';
import { PageHeader } from './components/ui/PageHeader';
import { useAuthSession } from './hooks/useAuthSession';
import { useHealthData } from './hooks/useHealthData';
import { useReadabilityMode } from './hooks/useReadabilityMode';
import { useSleepShieldWatcher } from './hooks/useSleepShieldWatcher';
import { useThemeMode } from './hooks/useThemeMode';
import type { ActiveTab } from './types/reflux';

// Code-split secondary views & modals to keep initial mobile load fast
const QuickLoggerView = lazy(() =>
  import('./components/QuickLoggerView').then((m) => ({ default: m.QuickLoggerView }))
);
const AssessmentView = lazy(() =>
  import('./components/AssessmentView').then((m) => ({ default: m.AssessmentView }))
);
const FoodAndScannerView = lazy(() =>
  import('./components/FoodAndScannerView').then((m) => ({ default: m.FoodAndScannerView }))
);
const DetectiveView = lazy(() =>
  import('./components/DetectiveView').then((m) => ({ default: m.DetectiveView }))
);
const KnowledgeView = lazy(() =>
  import('./components/KnowledgeView').then((m) => ({ default: m.KnowledgeView }))
);
const DoctorReportView = lazy(() =>
  import('./components/DoctorReportView').then((m) => ({ default: m.DoctorReportView }))
);
const AuthModal = lazy(() =>
  import('./components/AuthModal').then((m) => ({ default: m.AuthModal }))
);
const PrivacyPolicyModal = lazy(() =>
  import('./components/PrivacyPolicyModal').then((m) => ({ default: m.PrivacyPolicyModal }))
);

export default function App() {
  const { notify } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('login');
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [pendingLogStarter, setPendingLogStarter] = useState<string | null>(null);

  const openAuthModal = useCallback((mode: AuthModalMode = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }, []);
  const closeAuthModal = useCallback(() => setAuthModalOpen(false), []);
  const openPrivacyModal = useCallback(() => setPrivacyModalOpen(true), []);
  const closePrivacyModal = useCallback(() => setPrivacyModalOpen(false), []);
  const handleOpenPrivacyFromAuth = useCallback(() => {
    setAuthModalOpen(false);
    setPrivacyModalOpen(true);
  }, []);

  const handleStartPromptedLog = useCallback((starterText: string) => {
    setPendingLogStarter(starterText);
    setActiveTab('logger');
  }, []);
  const handleConsumePromptText = useCallback(() => setPendingLogStarter(null), []);

  const { readabilityMode, toggleReadabilityMode } = useReadabilityMode(notify);
  const { isDarkMode, toggleThemeMode } = useThemeMode(notify);

  // Ref callbacks bridge session events to health data reset without circular hooks
  const [resetBridge] = useState(() => ({
    reset: () => {},
    exitDemo: () => {},
  }));
  const onResetHealthData = useCallback(() => resetBridge.reset(), [resetBridge]);
  const onVerifiedLogin = useCallback(() => resetBridge.exitDemo(), [resetBridge]);

  const {
    user,
    emailVerified,
    isVerifiedUser,
    authReady,
    checkingVerification,
    resendingVerification,
    checkEmailVerified,
    resendVerification,
    handleSignOut,
  } = useAuthSession({ notify, onResetHealthData, onVerifiedLogin });

  const {
    effectiveState,
    isDemoPreview,
    canSavePersonal,
    resetAllData,
    exitDemoPreview,
    toggleDemoPreview,
    saveLog,
    deleteLog,
    saveAssessment,
    updateSleepShield,
  } = useHealthData({ user, emailVerified, notify, openAuthModal });

  resetBridge.reset = resetAllData;
  resetBridge.exitDemo = exitDemoPreview;

  useSleepShieldWatcher(effectiveState.sleepShield, notify);

  const handleStartDemoFromLanding = useCallback(
    (targetTab: ActiveTab = 'dashboard') => {
      setActiveTab(targetTab);
      if (!isDemoPreview) {
        toggleDemoPreview();
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [isDemoPreview, toggleDemoPreview]
  );

  const handleConfirmAndSignOut = useCallback(async () => {
    setActiveTab('dashboard');
    await handleSignOut();
  }, [handleSignOut]);

  /**
   * Confirmation toast before signing out so users are never abruptly ejected
   * by an accidental tap on "Çıkış Yap".
   */
  const requestSignOut = useCallback(() => {
    notify({
      title: 'Oturumu kapatmak istediğinize emin misiniz?',
      description:
        'Çıkış yaptığınızda ekrandaki tüm sağlık verileri güvenle temizlenir ve ana tanıtım sayfasına dönülür.',
      variant: 'warning',
      durationMs: 10_000,
      tag: 'reflu-logout-confirm',
      actions: [
        {
          label: 'Vazgeç',
          tone: 'secondary',
          onClick: () => {},
        },
        {
          label: 'Evet, Çıkış Yap',
          tone: 'danger',
          onClick: handleConfirmAndSignOut,
        },
      ],
    });
  }, [notify, handleConfirmAndSignOut]);

  const currentNav = useMemo(() => getNavItem(activeTab), [activeTab]);
  const showWorkspace = Boolean(user) || isDemoPreview;

  const showCompactAuthStrip =
    authReady &&
    isDemoPreview &&
    !user &&
    activeTab !== 'foods' &&
    activeTab !== 'knowledge';

  return (
    <>
      {authModalOpen && (
        <Suspense fallback={null}>
          <AuthModal
            open={authModalOpen}
            initialMode={authModalMode}
            onClose={closeAuthModal}
            onOpenPrivacyPolicy={handleOpenPrivacyFromAuth}
          />
        </Suspense>
      )}

      {privacyModalOpen && (
        <Suspense fallback={null}>
          <PrivacyPolicyModal open={privacyModalOpen} onClose={closePrivacyModal} />
        </Suspense>
      )}

      {/* Wait briefly for Firebase Auth restore to prevent Landing Page flicker */}
      {!authReady ? (
        <div
          role="status"
          aria-label="ReflüRehber yükleniyor"
          className="min-h-dvh bg-[#F4F8FC] flex flex-col items-center justify-center gap-3 p-6"
        >
          <img
            src="/app-icon.png"
            alt="ReflüRehber"
            width={40}
            height={40}
            className="w-10 h-10 rounded-xl object-cover ring-1 ring-[#CBE0FA] shadow-xs"
          />
          <p className="text-xs font-medium text-[#455D75]">Yükleniyor…</p>
        </div>
      ) : !showWorkspace ? (
        <LandingPage
          isDarkMode={isDarkMode}
          onToggleTheme={toggleThemeMode}
          readabilityMode={readabilityMode}
          onToggleReadability={toggleReadabilityMode}
          onOpenAuth={openAuthModal}
          onStartDemo={handleStartDemoFromLanding}
          onOpenPrivacy={openPrivacyModal}
        />
      ) : (
        <div className="min-h-dvh bg-[#F4F8FC] text-[#0F233A] flex overflow-x-clip">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[#1D6FD6] focus:text-white focus:text-sm focus:font-medium"
          >
            Ana içeriğe atla
          </a>

          <AppSidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            onOpenPrivacy={openPrivacyModal}
          />

          <div className="flex-1 flex flex-col min-w-0 lg:pl-[248px]">
            <AppHeader
              currentLabel={currentNav.label}
              isDarkMode={isDarkMode}
              onToggleTheme={toggleThemeMode}
              readabilityMode={readabilityMode}
              onToggleReadability={toggleReadabilityMode}
              isDemoPreview={isDemoPreview}
              onExitDemo={toggleDemoPreview}
              user={user}
              onOpenAuth={openAuthModal}
              onRequestSignOut={requestSignOut}
            />

            <main
              id="main-content"
              className="flex-1 w-full max-w-[1120px] mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-12 space-y-6"
            >
              {user && !emailVerified && (
                <div className="no-print">
                  <EmailVerificationBanner
                    email={user.email}
                    checking={checkingVerification}
                    resending={resendingVerification}
                    onCheckVerified={checkEmailVerified}
                    onResend={resendVerification}
                  />
                </div>
              )}

              {showCompactAuthStrip && (
                <div className="no-print">
                  <AuthGateCard
                    compact
                    onOpenAuth={openAuthModal}
                    onToggleDemo={toggleDemoPreview}
                    onOpenPrivacyPolicy={openPrivacyModal}
                    isDemoPreview={isDemoPreview}
                  />
                </div>
              )}

              {activeTab === 'dashboard' && (
                <DashboardView
                  logs={effectiveState.logs}
                  assessments={effectiveState.assessments}
                  sleepShield={effectiveState.sleepShield}
                  onUpdateSleepShield={updateSleepShield}
                  onNavigate={setActiveTab}
                  onStartPromptedLog={handleStartPromptedLog}
                  onLoadDemo={toggleDemoPreview}
                  isDemoLoaded={isDemoPreview}
                  isSignedIn={isVerifiedUser}
                  onOpenAuth={openAuthModal}
                />
              )}

              {activeTab !== 'dashboard' && (
                <Suspense fallback={<ViewFallback />}>
                  {activeTab === 'logger' && (
                    <QuickLoggerView
                      logs={effectiveState.logs}
                      onSaveLog={saveLog}
                      onDeleteLog={deleteLog}
                      canSave={canSavePersonal}
                      isDemoPreview={isDemoPreview}
                      onOpenAuth={openAuthModal}
                      initialPromptText={pendingLogStarter}
                      onConsumePromptText={handleConsumePromptText}
                      onNavigate={setActiveTab}
                    />
                  )}

                  {activeTab === 'assessment' && (
                    <AssessmentView
                      assessments={effectiveState.assessments}
                      onSaveAssessment={saveAssessment}
                      canSave={canSavePersonal}
                      isDemoPreview={isDemoPreview}
                      onOpenAuth={openAuthModal}
                    />
                  )}

                  {activeTab === 'foods' && <FoodAndScannerView logs={effectiveState.logs} />}

                  {activeTab === 'detective' &&
                    (!isVerifiedUser && !isDemoPreview ? (
                      <div className="space-y-6">
                        <PageHeader
                          kicker="Kişisel Öğün ve Belirti Analizi"
                          title="Kişisel Tetikleyici Dedektifi"
                        />
                        <AuthGateCard
                          title="Kişisel Tetikleyici Analizinize Güvenle Erişin"
                          onOpenAuth={openAuthModal}
                          onToggleDemo={toggleDemoPreview}
                          isDemoPreview={isDemoPreview}
                        />
                      </div>
                    ) : (
                      <DetectiveView
                        logs={effectiveState.logs}
                        state={effectiveState}
                        onNavigate={setActiveTab}
                        onLoadDemo={toggleDemoPreview}
                        onOpenPrivacyPolicy={openPrivacyModal}
                      />
                    ))}

                  {activeTab === 'knowledge' && <KnowledgeView />}

                  {activeTab === 'report' &&
                    (!isVerifiedUser && !isDemoPreview ? (
                      <div className="space-y-6">
                        <PageHeader
                          kicker="Tek Sayfalık A4 Yazdırılabilir Kişisel Gözlem Özeti"
                          title="Doktor Raporu"
                        />
                        <AuthGateCard
                          title="Kişisel Gözlem Özetiniz Yalnızca Hesabınızdan Oluşturulur"
                          onOpenAuth={openAuthModal}
                          onToggleDemo={toggleDemoPreview}
                          isDemoPreview={isDemoPreview}
                        />
                      </div>
                    ) : (
                      <DoctorReportView
                        state={effectiveState}
                        onOpenPrivacyPolicy={openPrivacyModal}
                      />
                    ))}
                </Suspense>
              )}

              <footer className="no-print pt-4 border-t border-[#E6EFF8] flex flex-wrap items-center justify-between gap-2 text-xs text-[#688099]">
                <span>Tıbbi tavsiye vermez · Sağlık verileriniz tarayıcıda saklanmaz.</span>
                <button
                  type="button"
                  onClick={openPrivacyModal}
                  className="font-medium text-[#155CC0] hover:text-[#1D6FD6] underline underline-offset-2 cursor-pointer"
                >
                  Gizlilik Politikası
                </button>
              </footer>
            </main>
          </div>

          <MobileBottomNav activeTab={activeTab} onSelectTab={setActiveTab} />
        </div>
      )}
    </>
  );
}
