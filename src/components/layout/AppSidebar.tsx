import { memo } from 'react';
import { Lock } from 'lucide-react';
import type { ActiveTab } from '../../types/reflux';
import { NAV_ITEMS } from './navigation';

interface AppSidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenPrivacy: () => void;
}

export const AppSidebar = memo(function AppSidebar({
  activeTab,
  onSelectTab,
  onOpenPrivacy,
}: AppSidebarProps) {
  return (
    <aside
      aria-label="Ana gezinme"
      className="no-print hidden lg:flex lg:flex-col lg:w-[248px] lg:fixed lg:inset-y-0 bg-white border-r border-[#DCE7F3]"
    >
      <button
        type="button"
        onClick={() => onSelectTab('dashboard')}
        className="px-6 h-16 flex items-center gap-2.5 border-b border-[#E6EFF8] text-left hover:bg-[#F7FBFF] transition-colors cursor-pointer"
      >
        <img
          src="/app-icon.png"
          alt="ReflüRehber"
          width={32}
          height={32}
          className="w-8 h-8 rounded-lg object-cover shrink-0 ring-1 ring-[#CBE0FA] shadow-[0_2px_6px_rgba(29,111,214,0.14)]"
        />
        <span className="font-display text-[17px] font-bold tracking-tight text-[#0F233A] whitespace-nowrap">
          ReflüRehber
        </span>
      </button>

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#EBF4FF] text-[#155CC0]'
                  : 'text-[#455D75] hover:text-[#0F233A] hover:bg-[#F4F8FC]'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-[#1D6FD6]' : 'text-[#688099]'
                }`}
                aria-hidden="true"
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#E6EFF8] space-y-2.5">
        <div className="flex items-center gap-2 text-[11px] font-medium text-[#155CC0]">
          <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Tarayıcıda veri saklanmaz</span>
        </div>
        <p className="text-[11px] leading-relaxed text-[#688099]">
          Tıbbi tavsiye veya teşhis vermez — yalnızca kişisel gözlem günlüğünüzdür.
        </p>
        <button
          type="button"
          onClick={onOpenPrivacy}
          className="text-[11px] font-medium text-[#155CC0] hover:text-[#1D6FD6] underline underline-offset-2 cursor-pointer"
        >
          Gizlilik Politikası
        </button>
      </div>
    </aside>
  );
});
