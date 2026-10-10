import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { TransactionTypesPanel } from './TransactionTypesPanel';
import { PaymentMethodsPanel } from './PaymentMethodsPanel';
import { type Transaction } from '../../data/transactions';
import { Tags, CreditCard } from 'lucide-react';

type SettingsPageProps = {
  transactions: Transaction[];
  onTransactionsChange: (txs: Transaction[]) => void;
};

export function SettingsPage({ transactions, onTransactionsChange }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<'types' | 'methods'>('types');

  return (
    <div className="space-y-8">
      <div>
        <div role="heading" aria-level={1} className="text-foreground text-3xl mb-2">
          Settings
        </div>
        <div className="text-muted-foreground">
          Customize how transactions are categorized and paid across your workspace.
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={val => setActiveTab(val as 'types' | 'methods')}>
        <TabsList className="bg-foreground/5 border border-border p-1 h-auto rounded-lg">
          <TabsTrigger
            value="types"
            className="flex items-center gap-2 py-2 px-4 rounded-md text-sm data-[state=active]:bg-cyan-500/20 data-[state=active]:text-theme-cyan"
          >
            <Tags className="w-4 h-4" />
            Transaction Types
          </TabsTrigger>
          <TabsTrigger
            value="methods"
            className="flex items-center gap-2 py-2 px-4 rounded-md text-sm data-[state=active]:bg-cyan-500/20 data-[state=active]:text-theme-cyan"
          >
            <CreditCard className="w-4 h-4" />
            Payment Methods
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
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
