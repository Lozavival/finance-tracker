import { LayoutDashboard, ArrowLeftRight, Wallet, Target, Settings, type LucideIcon } from 'lucide-react';
import { type TranslationKey } from '@/i18n';

export type PageId = 'dashboard' | 'transactions' | 'accounts' | 'goals' | 'settings';

export interface NavigationItem {
  id: PageId;
  key: TranslationKey;
  icon: LucideIcon;
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { icon: LayoutDashboard, key: 'nav.dashboard', id: 'dashboard' },
  { icon: ArrowLeftRight, key: 'nav.transactions', id: 'transactions' },
  { icon: Wallet, key: 'nav.accounts', id: 'accounts' },
  { icon: Target, key: 'nav.goals', id: 'goals' },
  { icon: Settings, key: 'nav.settings', id: 'settings' },
];
