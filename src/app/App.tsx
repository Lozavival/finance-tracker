import { useMemo, useState } from 'react';
import { TopNavigation } from './components/TopNavigation';
import { Sidebar } from './components/Sidebar';
import { SummaryCards } from './components/SummaryCards';
import { AnalyticsChart } from './components/AnalyticsChart';
import { TransactionsTable } from './components/TransactionsTable';
import { TransactionsPage } from './components/TransactionsPage';
import { SEEDED_TRANSACTIONS, getLatestMonthRange, type Transaction } from './data/transactions';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>(SEEDED_TRANSACTIONS);
  const defaultMonth = useMemo(() => getLatestMonthRange(SEEDED_TRANSACTIONS), []);
  const isTransactionsPage = activePage === 'transactions';

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navigation */}
      <TopNavigation />

      {/* Sidebar */}
      <Sidebar activeItem={activePage} onItemSelect={setActivePage} />

      {/* Main Content */}
      <div className="ml-64 mt-16 relative">
        <div className="p-8">
          {isTransactionsPage ? (
            <TransactionsPage
              transactions={transactions}
              defaultMonth={defaultMonth}
              onTransactionsChange={setTransactions}
            />
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
