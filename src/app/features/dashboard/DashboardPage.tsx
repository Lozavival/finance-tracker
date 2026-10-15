import { useI18n } from '@/i18n';
import { type Transaction } from '@/data/transactions';
import { useFinance } from '@/state/FinanceContext';
import { SummaryCards } from './SummaryCards';
import { AnalyticsChart } from './AnalyticsChart';
import { RecentTransactionsTable } from './RecentTransactionsTable';

interface DashboardPageProps {
  transactions?: Transaction[];
}

export function DashboardPage({ transactions: propTransactions }: DashboardPageProps) {
  const finance = useFinance();
  const transactions = propTransactions ?? finance.transactions;
  const { t } = useI18n();

  return (
    <div className="space-y-8">
      <div>
        <div role="heading" aria-level={1} className="text-foreground text-3xl mb-2">
          {t('dashboard.title')}
        </div>
        <div className="text-muted-foreground">{t('dashboard.subtitle')}</div>
      </div>
      <SummaryCards />
      <AnalyticsChart />
      <RecentTransactionsTable transactions={transactions} />
    </div>
  );
}
