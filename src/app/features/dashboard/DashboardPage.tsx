import { useMemo } from 'react';
import { useI18n } from '@/i18n';
import { type Transaction } from '@/data/transactions';
import { useFinance } from '@/state/FinanceContext';
import { useSettings } from '@/state/SettingsContext';
import { calculateDashboardKpis, generateSmartFinancialSignals } from '@/data/analytics';
import { DashboardKpisSection } from './DashboardKpis';
import { AnalyticsVisualizer } from './AnalyticsVisualizer';
import { SpendingBreakdownCard } from './SpendingBreakdownCard';
import { ActivityAndObligations } from './ActivityAndObligations';

interface DashboardPageProps {
  transactions?: Transaction[];
}

export function DashboardPage({ transactions: propTransactions }: DashboardPageProps) {
  const finance = useFinance();
  const { settings } = useSettings();
  const transactions = propTransactions ?? finance.transactions;
  const { t, formatFull } = useI18n();
  const today = finance.today;

  // 1. Generate smart heuristic signals
  const signals = useMemo(() => {
    return generateSmartFinancialSignals(
      transactions,
      settings,
      settings.goals,
      finance.statements,
      finance.recurringRules,
      finance.ledgers,
      today,
    );
  }, [transactions, settings, finance.statements, finance.recurringRules, finance.ledgers, today]);

  // 2. Compute dynamic KPIs
  const kpis = useMemo(() => {
    return calculateDashboardKpis(transactions, finance.ledgers, settings, settings.goals, today, signals.length);
  }, [transactions, finance.ledgers, settings, today, signals.length]);

  return (
    <div className="space-y-8">
      {/* Header with Greeting & Current Date */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">{t('dashboard.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
        </div>
        <div className="inline-flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-xl bg-foreground/5 border border-border/60 text-xs font-medium text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-theme-cyan animate-pulse" />
          <span>{formatFull(today)}</span>
        </div>
      </div>

      {/* 1. Dynamic Personal Finance KPIs (Card 4 triggers Smart Insights Popover) */}
      <DashboardKpisSection kpis={kpis} signals={signals} />

      {/* 2. Balanced Core Visual Analytics (50/50 Grid with spacious Donut & Cash Flow) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AnalyticsVisualizer transactions={transactions} goalsConfig={settings.goals} today={today} />
        <SpendingBreakdownCard transactions={transactions} today={today} />
      </div>

      {/* 3. Activity & Forward Cash Flow Feed */}
      <ActivityAndObligations transactions={transactions} today={today} />
    </div>
  );
}
