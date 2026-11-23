import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  FileText,
  Home,
  PenLine,
  Search,
} from 'lucide-react';
import type { ActiveTab } from '../../types/reflux';

export interface NavItem {
  readonly id: ActiveTab;
  readonly label: string;
  readonly mobileLabel: string;
  readonly icon: typeof Home;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'dashboard', label: 'Bugün', mobileLabel: 'Bugün', icon: Home },
  { id: 'logger', label: 'Hızlı Kayıt', mobileLabel: 'Kayıt', icon: PenLine },
  {
    id: 'assessment',
    label: 'Belirti Değerlendirme',
    mobileLabel: 'Test',
    icon: ClipboardCheck,
  },
  {
    id: 'foods',
    label: 'Besin & Ürün Kontrolü',
    mobileLabel: 'Besin',
    icon: Search,
  },
  {
    id: 'detective',
    label: 'Tetikleyici Dedektifi',
    mobileLabel: 'Analiz',
    icon: BarChart3,
  },
  {
    id: 'knowledge',
    label: 'Bilgi Kartları',
    mobileLabel: 'Rehber',
    icon: BookOpen,
  },
  {
    id: 'report',
    label: 'Doktor Raporu',
    mobileLabel: 'Rapor',
    icon: FileText,
  },
] as const;

export function getNavItem(tab: ActiveTab): NavItem {
  return NAV_ITEMS.find((n) => n.id === tab) ?? NAV_ITEMS[0];
}
