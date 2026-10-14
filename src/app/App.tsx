import { SEEDED_TRANSACTIONS } from '@/data/seed';
import { getToday } from '@/data/dates';
import { buildStatements } from '@/data/cardStatements';
import { buildCashMovements, buildLedgers } from '@/data/ledger';
import { useMemo, useState } from 'react';
import { TopNavigation } from '@/layout/TopNavigation';
import { Sidebar } from '@/layout/Sidebar';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { TransactionsPage } from '@/features/transactions/TransactionsPage';
import { type Transaction } from '@/data/transactions';
import { AccountsPage } from '@/features/accounts/AccountsPage';
import { AccountDetailPage } from '@/features/accounts/AccountDetailPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { GoalsPage } from '@/features/goals/GoalsPage';
import { Toaster } from '@/components/primitives/sonner';
import { SettingsProvider, useSettings } from '@/state/SettingsContext';
import { I18nProvider } from '@/i18n';

function AppContent() {
  const { settings } = useSettings();
  const [activePage, setActivePage] = useState('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>(SEEDED_TRANSACTIONS);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const today = useMemo(() => getToday(), []);

  const finance = useMemo(() => {
    const statements = buildStatements(transactions, settings, today);
    const movements = buildCashMovements(transactions, statements, settings);
    const ledgers = buildLedgers(movements, settings);
    return { statements, ledgers, today };
  }, [transactions, settings, today]);

  const handleSidebarSelect = (id: string) => {
    setActivePage(id);
    setSelectedAccountId(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNavigation />
      <Sidebar activeItem={activePage} onItemSelect={handleSidebarSelect} />

      <div className="ml-64 mt-16 relative">
        <div className="p-8">
          {activePage === 'transactions' ? (
            <TransactionsPage transactions={transactions} onTransactionsChange={setTransactions} />
          ) : activePage === 'accounts' ? (
            selectedAccountId ? (
              <AccountDetailPage
                accountId={selectedAccountId}
                finance={finance}
                transactions={transactions}
                onTransactionsChange={setTransactions}
                onBack={() => setSelectedAccountId(null)}
              />
            ) : (
              <AccountsPage finance={finance} transactions={transactions} onAccountSelect={setSelectedAccountId} />
            )
          ) : activePage === 'goals' ? (
            <GoalsPage transactions={transactions} onTransactionsChange={setTransactions} />
          ) : activePage === 'settings' ? (
            <SettingsPage transactions={transactions} onTransactionsChange={setTransactions} />
          ) : (
            <DashboardPage transactions={transactions} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <SettingsProvider>
        <AppContent />
        <Toaster position="bottom-right" />
      </SettingsProvider>
    </I18nProvider>
  );
}
