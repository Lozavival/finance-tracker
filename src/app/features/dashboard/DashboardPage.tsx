import { useState, useMemo } from 'react';
import { useI18n } from '@/i18n';
import { type SupportedCurrency } from '@/i18n/types';
import { type Transaction } from '@/data/transactions';
import { useFinance } from '@/state/FinanceContext';
import { useSettings } from '@/state/SettingsContext';
import { calculateDashboardKpis, generateSmartFinancialSignals } from '@/data/analytics';
import { Button } from '@/components/primitives/button';
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
  const { t, formatFull, currency } = useI18n();
  const today = finance.today;

  const rate = settings.exchangeRate?.rate;
  const hasRate = rate !== null && rate !== undefined && rate > 0;
  const [currencyScope, setCurrencyScope] = useState<'all' | SupportedCurrency>(hasRate ? 'all' : currency);

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
    return calculateDashboardKpis(
      transactions,
      finance.ledgers,
      settings,
      settings.goals,
      today,
      signals.length,
      currency,
    );
  }, [transactions, finance.ledgers, settings, today, signals.length, currency]);

  // If exchange rate is not available, 'all' cannot be calculated; fallback to preferred currency
  const effectiveScope: 'all' | SupportedCurrency = !kpis.hasRate && currencyScope === 'all' ? currency : currencyScope;

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
      <div className="space-y-4">
        {kpis.hasMultipleCurrencies && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('dashboard.currencyScopeLabel')}
              </span>
              {!kpis.hasRate && (
                <span className="text-[11px] text-theme-orange bg-theme-orange/10 border border-theme-orange/20 px-2 py-0.5 rounded-full font-medium">
                  {t('dashboard.rateNotSetScope', { currency: effectiveScope })}
                </span>
              )}
            </div>

            <div className="flex items-center p-0.5 rounded-xl bg-foreground/5 border border-border/60">
              {kpis.hasRate && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrencyScope('all')}
                  className={`h-7 px-3 text-xs font-medium rounded-lg transition-all ${
                    effectiveScope === 'all'
                      ? 'bg-theme-cyan/20 text-theme-cyan font-bold border border-theme-cyan/40 shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                  }`}
                >
                  {t('dashboard.allCurrenciesConverted')}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCurrencyScope('BRL')}
                className={`h-7 px-3 text-xs font-medium rounded-lg transition-all ${
                  effectiveScope === 'BRL'
                    ? 'bg-theme-cyan/20 text-theme-cyan font-bold border border-theme-cyan/40 shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                }`}
              >
                BRL (R$)
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCurrencyScope('USD')}
                className={`h-7 px-3 text-xs font-medium rounded-lg transition-all ${
                  effectiveScope === 'USD'
                    ? 'bg-theme-cyan/20 text-theme-cyan font-bold border border-theme-cyan/40 shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                }`}
              >
                USD ($)
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <AnalyticsVisualizer
            transactions={transactions}
            goalsConfig={settings.goals}
            today={today}
            currencyScope={effectiveScope}
          />
          <SpendingBreakdownCard transactions={transactions} today={today} currencyScope={effectiveScope} />
        </div>
      </div>

      {/* 3. Activity & Forward Cash Flow Feed */}
      <ActivityAndObligations transactions={transactions} today={today} />
    </div>
  );
}
