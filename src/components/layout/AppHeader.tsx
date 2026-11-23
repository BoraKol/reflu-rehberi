import { memo } from 'react';
import type { User } from 'firebase/auth';
import { Database, Eye, LogIn, LogOut, UserPlus, X } from 'lucide-react';
import type { AuthModalMode } from '../AuthModal';

interface AppHeaderProps {
  currentLabel: string;
  readabilityMode: boolean;
  onToggleReadability: () => void;
  isDemoPreview: boolean;
  onToggleDemo: () => void;
  authReady: boolean;
  user: User | null;
  onOpenAuth: (mode?: AuthModalMode) => void;
  onSignOut: () => void;
}

export const AppHeader = memo(function AppHeader({
  currentLabel,
  readabilityMode,
  onToggleReadability,
  isDemoPreview,
  onToggleDemo,
  authReady,
  user,
  onOpenAuth,
  onSignOut,
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
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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

        <button
          type="button"
          onClick={onToggleDemo}
          className={`hidden md:inline-flex items-center justify-center gap-1.5 min-h-9 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
            isDemoPreview
              ? 'border-[#BBD6F7] bg-[#EBF4FF] text-[#155CC0] hover:bg-[#DCEBFE]'
              : 'border-[#DCE7F3] bg-white text-[#455D75] hover:text-[#0F233A] hover:bg-[#F4F8FC]'
          }`}
        >
          {isDemoPreview ? (
            <>
              <X className="w-3.5 h-3.5" aria-hidden="true" />
              Önizlemeyi Kapat
            </>
          ) : (
            <>
              <Database className="w-3.5 h-3.5 text-[#1D6FD6]" aria-hidden="true" />
              Örnek Önizle
            </>
          )}
        </button>

        {authReady && user ? (
          <div className="flex items-center gap-1.5 sm:gap-2 sm:pl-2 sm:border-l sm:border-[#E6EFF8]">
            <div className="hidden sm:flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-[#EBF4FF] text-[#155CC0] text-xs font-semibold flex items-center justify-center shrink-0">
                {userInitial}
              </span>
              <span className="text-xs font-medium text-[#0F233A] max-w-[140px] truncate">
                {user.displayName || user.email || 'Hesabım'}
              </span>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              aria-label="Çıkış Yap"
              className="inline-flex items-center justify-center gap-1.5 min-h-9 px-2.5 sm:px-3 py-1.5 rounded-lg border border-[#DCE7F3] bg-white text-xs font-medium text-[#455D75] hover:text-[#0F233A] hover:bg-[#F4F8FC] transition-colors whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden xs:inline sm:inline">Çıkış Yap</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => onOpenAuth('register')}
              className="hidden sm:inline-flex items-center justify-center gap-1.5 min-h-9 px-3 py-1.5 rounded-lg border border-[#DCE7F3] bg-white text-xs font-medium text-[#0F233A] hover:bg-[#F4F8FC] transition-colors whitespace-nowrap cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#1D6FD6]" aria-hidden="true" />
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
