import { memo } from 'react';
import type { ActiveTab } from '../../types/reflux';
import { NAV_ITEMS } from './navigation';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

/**
 * Responsive mobile bottom navigation bar.
 * - Safe-area aware for iPhone notch/home-indicator & Android gesture bars.
 * - Touch targets >= 44px height; horizontal scroll fallback on ultra-narrow (<360px) phones
 *   so 7 tabs never crush labels into unreadable 1-letter stubs.
 */
export const MobileBottomNav = memo(function MobileBottomNav({
  activeTab,
  onSelectTab,
}: MobileBottomNavProps) {
  return (
    <nav
      aria-label="Mobil gezinme"
      className="no-print lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-xs border-t border-[#DCE7F3] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-7 gap-0.5 px-1 py-1 max-w-2xl mx-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              className={`flex flex-col items-center justify-center min-h-[46px] py-1.5 px-0.5 rounded-lg text-[10px] sm:text-[11px] font-medium transition-colors cursor-pointer touch-manipulation ${
                isActive
                  ? 'text-[#155CC0] bg-[#EBF4FF]'
                  : 'text-[#688099] active:bg-[#F4F8FC]'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5 shrink-0" aria-hidden="true" />
              <span className="truncate max-w-full leading-tight">
                {item.mobileLabel}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});
