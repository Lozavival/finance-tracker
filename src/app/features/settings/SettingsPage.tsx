import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { TransactionTypesPanel } from './TransactionTypesPanel';
import { PaymentMethodsPanel } from './PaymentMethodsPanel';
import { PreferencesPanel } from './PreferencesPanel';
import { type Transaction } from '@/data/transactions';
import { Tags, CreditCard, SlidersHorizontal } from 'lucide-react';
import { useI18n } from '@/i18n';

type SettingsPageProps = {
  transactions: Transaction[];
  onTransactionsChange: (txs: Transaction[]) => void;
};

export function SettingsPage({ transactions, onTransactionsChange }: SettingsPageProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'preferences' | 'types' | 'methods'>('preferences');

  return (
    <div className="space-y-8">
      <div>
        <div role="heading" aria-level={1} className="text-foreground text-3xl mb-2">
          {t('settings.title')}
        </div>
        <div className="text-muted-foreground">{t('settings.subtitle')}</div>
      </div>

      <Tabs value={activeTab} onValueChange={val => setActiveTab(val as 'preferences' | 'types' | 'methods')}>
        <TabsList className="bg-foreground/5 border border-border p-1 h-auto rounded-lg">
          <TabsTrigger
            value="preferences"
            className="flex items-center gap-2 py-2 px-4 rounded-md text-sm data-[state=active]:bg-cyan-500/20 data-[state=active]:text-theme-cyan"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {t('settings.tabPreferences')}
          </TabsTrigger>
          <TabsTrigger
            value="types"
            className="flex items-center gap-2 py-2 px-4 rounded-md text-sm data-[state=active]:bg-cyan-500/20 data-[state=active]:text-theme-cyan"
          >
            <Tags className="w-4 h-4" />
            {t('settings.tabTypes')}
          </TabsTrigger>
          <TabsTrigger
            value="methods"
            className="flex items-center gap-2 py-2 px-4 rounded-md text-sm data-[state=active]:bg-cyan-500/20 data-[state=active]:text-theme-cyan"
          >
            <CreditCard className="w-4 h-4" />
            {t('settings.tabMethods')}
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
            <PaymentMethodsPanel transactions={transactions} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
