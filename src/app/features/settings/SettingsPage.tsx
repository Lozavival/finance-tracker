import { useState } from 'react';
import { SlidersHorizontal, Tags, CreditCard, Bell } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { PreferencesPanel } from './PreferencesPanel';
import { TransactionTypesPanel } from './TransactionTypesPanel';
import { PaymentMethodsPanel } from './PaymentMethodsPanel';
import { NotificationsPanel } from './NotificationsPanel';
import { type Transaction } from '@/data/transactions';
import { useFinance } from '@/state/FinanceContext';
import { useI18n } from '@/i18n';

type SettingsPageProps = {
  transactions?: Transaction[];
  onTransactionsChange?: (txs: Transaction[]) => void;
};

export function SettingsPage({
  transactions: propTransactions,
  onTransactionsChange: propOnTransactionsChange,
}: SettingsPageProps = {}) {
  const finance = useFinance();
  const transactions = propTransactions ?? finance.transactions;
  const onTransactionsChange = propOnTransactionsChange ?? ((txs: Transaction[]) => finance.setTransactions(txs));
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'preferences' | 'types' | 'methods' | 'notifications'>('preferences');

  return (
    <div className="space-y-8">
      <div>
        <div role="heading" aria-level={1} className="text-foreground text-3xl mb-2">
          {t('settings.title')}
        </div>
        <div className="text-muted-foreground">{t('settings.subtitle')}</div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={val => setActiveTab(val as 'preferences' | 'types' | 'methods' | 'notifications')}
      >
        <TabsList className="bg-foreground/5 border border-border p-1 h-auto rounded-lg max-w-full overflow-x-auto justify-start flex-nowrap">
          <TabsTrigger
            value="preferences"
            aria-label={t('settings.tabPreferences')}
            className="flex items-center gap-2 py-2 px-3 sm:px-4 rounded-md text-sm data-[state=active]:bg-theme-cyan/20 data-[state=active]:text-theme-cyan shrink-0"
          >
            <SlidersHorizontal className="size-4 shrink-0" />
            <span className="hidden sm:inline">{t('settings.tabPreferences')}</span>
          </TabsTrigger>
          <TabsTrigger
            value="types"
            aria-label={t('settings.tabTypes')}
            className="flex items-center gap-2 py-2 px-3 sm:px-4 rounded-md text-sm data-[state=active]:bg-theme-cyan/20 data-[state=active]:text-theme-cyan shrink-0"
          >
            <Tags className="size-4 shrink-0" />
            <span className="hidden sm:inline">{t('settings.tabTypes')}</span>
          </TabsTrigger>
          <TabsTrigger
            value="methods"
            aria-label={t('settings.tabMethods')}
            className="flex items-center gap-2 py-2 px-3 sm:px-4 rounded-md text-sm data-[state=active]:bg-theme-cyan/20 data-[state=active]:text-theme-cyan shrink-0"
          >
            <CreditCard className="size-4 shrink-0" />
            <span className="hidden sm:inline">{t('settings.tabMethods')}</span>
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            aria-label={t('settings.tabNotifications')}
            className="flex items-center gap-2 py-2 px-3 sm:px-4 rounded-md text-sm data-[state=active]:bg-theme-cyan/20 data-[state=active]:text-theme-cyan shrink-0"
          >
            <Bell className="size-4 shrink-0" />
            <span className="hidden sm:inline">{t('settings.tabNotifications')}</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="preferences" className="m-0 focus-visible:outline-none">
            <PreferencesPanel />
          </TabsContent>

          <TabsContent value="types" className="m-0 focus-visible:outline-none">
            <TransactionTypesPanel transactions={transactions} onTransactionsChange={onTransactionsChange} />
          </TabsContent>

          <TabsContent value="methods" className="m-0 focus-visible:outline-none">
            <PaymentMethodsPanel transactions={transactions} onTransactionsChange={onTransactionsChange} />
          </TabsContent>

          <TabsContent value="notifications" className="m-0 focus-visible:outline-none">
            <NotificationsPanel />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
