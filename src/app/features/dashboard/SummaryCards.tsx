import { useMemo } from 'react';
import { TrendingUp, DollarSign, Activity, CalendarClock } from 'lucide-react';
import { Card } from '@/components/primitives/card';
import { useI18n } from '@/i18n';
import { useFinance } from '@/state/FinanceContext';
import { useSettings } from '@/state/SettingsContext';
import { getAccountCurrencies } from '@/data/settings';
import { getAccountForecast } from '@/data/ledger';
import { convertCents } from '@/data/currency';
import { type SupportedCurrency } from '@/i18n/types';

export function SummaryCards() {
  const { t, formatCents, formatNumber, currency } = useI18n();
  const finance = useFinance();
  const { settings } = useSettings();

  const rate = settings.exchangeRate?.rate;
  const hasRate = rate !== null && rate !== undefined && rate > 0;

  const activeAccounts = useMemo(() => {
    return settings.accounts.filter(a => !a.archived);
  }, [settings.accounts]);

  // Compute portfolio balances per currency
  const balancesByCurrency = useMemo(() => {
    const result: Record<SupportedCurrency, number> = { BRL: 0, USD: 0 };
    const horizonEnd = new Date(finance.today.getFullYear(), finance.today.getMonth() + 1, 0);

    activeAccounts.forEach(acc => {
      const currencies = getAccountCurrencies(acc);
      currencies.forEach(curr => {
        const pocketLedger = finance.ledgers[`${acc.id}:${curr}`] ?? finance.ledgers[acc.id];
        if (pocketLedger) {
          const forecast = getAccountForecast(pocketLedger, finance.today, horizonEnd);
          result[curr] += forecast.current;
        }
      });
    });

    return result;
  }, [activeAccounts, finance.ledgers, finance.today]);

  // Monthly inflow per currency
  const currentMonthInflow = useMemo(() => {
    const result: Record<SupportedCurrency, number> = { BRL: 0, USD: 0 };
    const now = finance.today;
    const year = now.getFullYear();
    const month = now.getMonth();

    finance.transactions.forEach(tx => {
      if (tx.direction === 'income' && tx.date.getFullYear() === year && tx.date.getMonth() === month) {
        const curr = tx.currency ?? 'USD';
        result[curr] += tx.value * 100;
      }
    });

    return result;
  }, [finance.transactions, finance.today]);

  const convertedBalance = useMemo(() => {
    if (!hasRate) return null;
    const brlInPref = convertCents(balancesByCurrency.BRL, 'BRL', currency, rate) ?? 0;
    const usdInPref = convertCents(balancesByCurrency.USD, 'USD', currency, rate) ?? 0;
    return currency === 'USD' ? balancesByCurrency.USD + brlInPref : balancesByCurrency.BRL + usdInPref;
  }, [hasRate, balancesByCurrency, currency, rate]);

  const convertedInflow = useMemo(() => {
    if (!hasRate) return null;
    const brlInPref = convertCents(currentMonthInflow.BRL, 'BRL', currency, rate) ?? 0;
    const usdInPref = convertCents(currentMonthInflow.USD, 'USD', currency, rate) ?? 0;
    return currency === 'USD' ? currentMonthInflow.USD + brlInPref : currentMonthInflow.BRL + usdInPref;
  }, [hasRate, currentMonthInflow, currency, rate]);

  const upcomingCount = useMemo(() => {
    return finance.transactions.filter(tx => tx.date.getTime() > finance.today.getTime()).length;
  }, [finance.transactions, finance.today]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* 1. Total Balance */}
      <Card className="p-6 bg-foreground/5 backdrop-blur-xl border border-border hover:border-theme-cyan/40 transition-all duration-300 relative overflow-hidden group">
        <div className="w-12 h-12 rounded-lg bg-theme-cyan/15 text-theme-cyan flex items-center justify-center mb-4">
          <DollarSign className="w-6 h-6" />
        </div>
        <div className="relative z-10">
          <p className="text-muted-foreground text-sm mb-1">{t('dashboard.totalBalance')}</p>
          {hasRate && convertedBalance !== null ? (
            <div>
              <p className="text-foreground text-2xl font-bold mb-1">{formatCents(convertedBalance, currency)}</p>
              <p className="text-xs text-muted-foreground">
                {formatCents(balancesByCurrency.BRL, 'BRL')} · {formatCents(balancesByCurrency.USD, 'USD')}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-foreground text-xl font-bold mb-0.5">{formatCents(balancesByCurrency.BRL, 'BRL')}</p>
              <p className="text-foreground text-xl font-bold mb-1">{formatCents(balancesByCurrency.USD, 'USD')}</p>
              <p className="text-xs text-theme-cyan font-medium">{t('accounts.breakdown')}</p>
            </div>
          )}
        </div>
      </Card>

      {/* 2. Monthly Inflow */}
      <Card className="p-6 bg-foreground/5 backdrop-blur-xl border border-border hover:border-theme-green/40 transition-all duration-300 relative overflow-hidden group">
        <div className="w-12 h-12 rounded-lg bg-theme-green/15 text-theme-green flex items-center justify-center mb-4">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div className="relative z-10">
          <p className="text-muted-foreground text-sm mb-1">{t('dashboard.monthlyRevenue')}</p>
          {hasRate && convertedInflow !== null ? (
            <div>
              <p className="text-foreground text-2xl font-bold mb-1">+{formatCents(convertedInflow, currency)}</p>
              <p className="text-xs text-muted-foreground">
                +{formatCents(currentMonthInflow.BRL, 'BRL')} · +{formatCents(currentMonthInflow.USD, 'USD')}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-theme-green text-xl font-bold mb-0.5">+{formatCents(currentMonthInflow.BRL, 'BRL')}</p>
              <p className="text-theme-green text-xl font-bold mb-1">+{formatCents(currentMonthInflow.USD, 'USD')}</p>
              <p className="text-xs text-theme-green font-medium">{t('accounts.breakdown')}</p>
            </div>
          )}
        </div>
      </Card>

      {/* 3. Total Transactions */}
      <Card className="p-6 bg-foreground/5 backdrop-blur-xl border border-border hover:border-theme-blue/40 transition-all duration-300 relative overflow-hidden group">
        <div className="w-12 h-12 rounded-lg bg-theme-blue/15 text-theme-blue flex items-center justify-center mb-4">
          <Activity className="w-6 h-6" />
        </div>
        <div className="relative z-10">
          <p className="text-muted-foreground text-sm mb-1">{t('dashboard.newTransactions')}</p>
          <p className="text-foreground text-2xl font-bold mb-1">{formatNumber(finance.transactions.length)}</p>
          <p className="text-xs text-theme-blue">{t('settings.active')}</p>
        </div>
      </Card>

      {/* 4. Scheduled Upcoming */}
      <Card className="p-6 bg-foreground/5 backdrop-blur-xl border border-border hover:border-theme-orange/40 transition-all duration-300 relative overflow-hidden group">
        <div className="w-12 h-12 rounded-lg bg-theme-orange/15 text-theme-orange flex items-center justify-center mb-4">
          <CalendarClock className="w-6 h-6" />
        </div>
        <div className="relative z-10">
          <p className="text-muted-foreground text-sm mb-1">{t('transactions.scheduled')}</p>
          <p className="text-foreground text-2xl font-bold mb-1">{formatNumber(upcomingCount)}</p>
          <p className="text-xs text-theme-orange">{t('common.status')}</p>
        </div>
      </Card>
    </div>
  );
}
