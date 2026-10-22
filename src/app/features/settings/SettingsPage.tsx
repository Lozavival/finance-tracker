import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { TransactionTypesPanel } from './TransactionTypesPanel';
import { PaymentMethodsPanel } from './PaymentMethodsPanel';
import { PreferencesPanel } from './PreferencesPanel';
import { NotificationsPanel } from './NotificationsPanel';
import { type Transaction } from '@/data/transactions';
import { useFinance } from '@/state/FinanceContext';
import { Tags, CreditCard, SlidersHorizontal, Bell } from 'lucide-react';
import { useI18n } from '@/i18n';

type SettingsPageProps = {
  transactions?: Transaction[];
  onTransactionsChange?: (txs: Transaction[]) => void;
};

export function SettingsPage({
  transactions: propTransactions,
  onTransactionsChange: propOnTransactionsChange,
}: SettingsPageProps) {
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
        <TabsList className="bg-foreground/5 border border-border p-1 h-auto rounded-lg">
          <TabsTrigger
            value="preferences"
            className="flex items-center gap-2 py-2 px-4 rounded-md text-sm data-[state=active]:bg-theme-cyan/20 data-[state=active]:text-theme-cyan"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {t('settings.tabPreferences')}
          </TabsTrigger>
          <TabsTrigger
            value="types"
            className="flex items-center gap-2 py-2 px-4 rounded-md text-sm data-[state=active]:bg-theme-cyan/20 data-[state=active]:text-theme-cyan"
          >
            <Tags className="w-4 h-4" />
            {t('settings.tabTypes')}
          </TabsTrigger>
          <TabsTrigger
            value="methods"
            className="flex items-center gap-2 py-2 px-4 rounded-md text-sm data-[state=active]:bg-theme-cyan/20 data-[state=active]:text-theme-cyan"
          >
            <CreditCard className="w-4 h-4" />
            {t('settings.tabMethods')}
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center gap-2 py-2 px-4 rounded-md text-sm data-[state=active]:bg-theme-cyan/20 data-[state=active]:text-theme-cyan"
          >
            <Bell className="w-4 h-4" />
            {t('settings.tabNotifications')}
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
