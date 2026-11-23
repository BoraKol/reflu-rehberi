import { memo } from 'react';
import type { User } from 'firebase/auth';
import { ArrowLeft, Eye, LogIn, LogOut, Moon, Sun, UserPlus } from 'lucide-react';
import type { AuthModalMode } from '../AuthModal';

interface AppHeaderProps {
  currentLabel: string;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  readabilityMode: boolean;
  onToggleReadability: () => void;
  isDemoPreview: boolean;
  onExitDemo: () => void;
  user: User | null;
  onOpenAuth: (mode?: AuthModalMode) => void;
  onRequestSignOut: () => void;
}

/**
 * Authenticated & Demo-preview workspace top bar.
 * Keeps controls focused on the active session (theme, readability, account/logout,
 * or exiting temporary demo preview back to the landing page).
 */
export const AppHeader = memo(function AppHeader({
  currentLabel,
  isDarkMode,
  onToggleTheme,
  readabilityMode,
  onToggleReadability,
  isDemoPreview,
  onExitDemo,
  user,
  onOpenAuth,
  onRequestSignOut,
}: AppHeaderProps) {
  const userInitial =
    user?.displayName?.trim().charAt(0).toUpperCase() ||
    user?.email?.trim().charAt(0).toUpperCase() ||
    'K';

  return (
    <header className="no-print sticky top-0 z-20 min-h-14 sm:h-16 bg-white/95 backdrop-blur-xs border-b border-[#DCE7F3] px-3 sm:px-6 lg:px-8 pt-[env(safe-area-inset-top)] flex items-center justify-between gap-2 sm:gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <img
          src="/app-icon.png"
          alt="ReflüRehber"
          width={28}
          height={28}
          className="w-7 h-7 rounded-lg object-cover lg:hidden shrink-0 ring-1 ring-[#CBE0FA] shadow-[0_2px_6px_rgba(29,111,214,0.14)]"
        />
        <span className="font-display font-bold text-[15px] sm:text-base text-[#0F233A] lg:hidden whitespace-nowrap truncate">
          ReflüRehber
        </span>
        <span className="hidden lg:inline text-xs font-medium text-[#688099] whitespace-nowrap">
          ReflüRehber
        </span>
        <span aria-hidden="true" className="hidden lg:inline text-[#CBD5E1]">
          /
        </span>
        <span className="hidden lg:inline text-sm font-medium text-[#0F233A] truncate">
          {currentLabel}
        </span>
        {isDemoPreview && !user && (
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-[#EBF4FF] border border-[#CBE0FA] text-[11px] font-semibold text-[#155CC0] whitespace-nowrap">
            Örnek Önizleme
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-pressed={isDarkMode}
          aria-label={isDarkMode ? 'Aydınlık moda geç' : 'Karanlık moda geç'}
          title={isDarkMode ? 'Aydınlık Mod' : 'Karanlık Mod'}
          className="inline-flex items-center justify-center gap-1.5 min-h-9 min-w-9 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[#DCE7F3] bg-white text-[#455D75] hover:text-[#0F233A] hover:bg-[#F4F8FC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 text-[#FBBF24] shrink-0" aria-hidden="true" />
          ) : (
            <Moon className="w-4 h-4 text-[#1D6FD6] shrink-0" aria-hidden="true" />
          )}
          <span className="hidden xl:inline">{isDarkMode ? 'Aydınlık' : 'Karanlık'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleReadability}
          aria-pressed={readabilityMode}
          aria-label={
            readabilityMode
              ? 'Okunabilirlik Modu açık, kapatmak için tıklayın'
              : 'Okunabilirlik Modu kapalı, açmak için tıklayın'
          }
          title="Yüksek kontrastlı metin ve geniş satır aralığı"
          className={`inline-flex items-center justify-center gap-1 sm:gap-1.5 min-h-9 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            readabilityMode
              ? 'border-[#0A469B] bg-[#0A469B] text-white hover:bg-[#083880]'
              : 'border-[#DCE7F3] bg-white text-[#455D75] hover:text-[#0F233A] hover:bg-[#F4F8FC]'
          }`}
        >
          <Eye
            className={`w-3.5 h-3.5 shrink-0 ${
              readabilityMode ? 'text-white' : 'text-[#1D6FD6]'
            }`}
            aria-hidden="true"
          />
          <span className="hidden sm:inline">
            {readabilityMode ? 'Okunabilirlik · Açık' : 'Okunabilirlik'}
          </span>
          <span className="sm:hidden">Okuma</span>
        </button>

        {user ? (
          <div className="flex items-center gap-1.5 sm:gap-2 sm:pl-2 sm:border-l sm:border-[#E6EFF8]">
            <div className="hidden sm:flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-[#EBF4FF] text-[#155CC0] text-xs font-semibold flex items-center justify-center shrink-0">
                {userInitial}
              </span>
              <span className="text-xs font-medium text-[#0F233A] max-w-[150px] truncate">
                {user.displayName || user.email || 'Hesabım'}
              </span>
            </div>
            <button
              type="button"
              onClick={onRequestSignOut}
              aria-label="Çıkış Yap"
              className="inline-flex items-center justify-center gap-1.5 min-h-9 px-2.5 sm:px-3 py-1.5 rounded-lg border border-[#DCE7F3] bg-white text-xs font-medium text-[#455D75] hover:text-[#B91C1C] hover:border-[#FECACA] hover:bg-[#FEF2F2] transition-colors whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Çıkış Yap</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2">
            {isDemoPreview && (
              <button
                type="button"
                onClick={onExitDemo}
                className="inline-flex items-center justify-center gap-1.5 min-h-9 px-2.5 sm:px-3 py-1.5 rounded-lg border border-[#DCE7F3] bg-white text-xs font-medium text-[#455D75] hover:text-[#0F233A] hover:bg-[#F4F8FC] transition-colors whitespace-nowrap cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">Tanıtım Sayfası</span>
                <span className="sm:hidden">Çık</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenAuth('register')}
              className="hidden sm:inline-flex items-center justify-center gap-1.5 min-h-9 px-3 py-1.5 rounded-lg border border-[#BBD6F7] bg-[#F0F7FF] text-xs font-medium text-[#155CC0] hover:bg-[#E2EEF9] transition-colors whitespace-nowrap cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
              Kaydol
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="inline-flex items-center justify-center gap-1.5 min-h-9 px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-[#1D6FD6] text-white text-xs font-medium hover:bg-[#1659B3] transition-colors whitespace-nowrap cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Giriş Yap</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
});
