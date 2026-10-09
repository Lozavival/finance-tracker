import { SEEDED_TRANSACTIONS } from './data/seed';
import { getToday } from './data/dates';
import { buildStatements } from './data/cardStatements';
import { buildCashMovements, buildLedgers } from './data/ledger';
import { useMemo, useState } from 'react';
import { TopNavigation } from './components/TopNavigation';
import { Sidebar } from './components/Sidebar';
import { SummaryCards } from './components/SummaryCards';
import { AnalyticsChart } from './components/AnalyticsChart';
import { TransactionsTable } from './components/TransactionsTable';
import { TransactionsPage } from './components/TransactionsPage';
import { type Transaction, type Account } from './data/transactions';
import { AccountsPage } from './components/accounts/AccountsPage';
import { AccountDetailPage } from './components/accounts/AccountDetailPage';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>(SEEDED_TRANSACTIONS);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const today = useMemo(() => getToday(), []);

  const finance = useMemo(() => {
    const statements = buildStatements(transactions, today);
    const movements = buildCashMovements(transactions, statements);
    const ledgers = buildLedgers(movements);
    return { statements, ledgers, today };
  }, [transactions, today]);

  const handleSidebarSelect = (id: string) => {
    setActivePage(id);
    setSelectedAccount(null);
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
            selectedAccount ? (
              <AccountDetailPage
                account={selectedAccount}
                finance={finance}
                transactions={transactions}
                onTransactionsChange={setTransactions}
                onBack={() => setSelectedAccount(null)}
              />
            ) : (
              <AccountsPage finance={finance} transactions={transactions} onAccountSelect={setSelectedAccount} />
            )
          ) : (
            <div className="space-y-8">
              <div>
                <div role="heading" aria-level={1} className="text-foreground text-3xl mb-2">
                  Dashboard
                </div>
                <div className="text-muted-foreground">Welcome back! Here's your financial overview.</div>
              </div>
              <SummaryCards />
              <AnalyticsChart />
              <TransactionsTable transactions={transactions} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
