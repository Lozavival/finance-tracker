import { useState, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, type TooltipProps } from 'recharts';
import { TrendingUp, TrendingDown, PieChart as PieIcon } from 'lucide-react';
import { Card } from '@/components/primitives/card';
import { Button } from '@/components/primitives/button';
import { useI18n } from '@/i18n';
import { useSettings } from '@/state/SettingsContext';
import { type Transaction } from '@/data/transactions';
import { type SupportedCurrency } from '@/i18n/types';
import { calculateCategoryBreakdown, type CategoryBreakdownItem } from '@/data/analytics';

interface SpendingBreakdownCardProps {
  transactions: Transaction[];
  today: Date;
  currencyScope?: 'all' | SupportedCurrency;
}

export function SpendingBreakdownCard({ transactions, today, currencyScope = 'all' }: SpendingBreakdownCardProps) {
  const { t, formatCents, currency } = useI18n();
  const { settings } = useSettings();
  const [mode, setMode] = useState<'types' | 'goals'>('types');
  const [period, setPeriod] = useState<'this-month' | 'last-month' | 'last-90-days'>('this-month');

  const rate = settings.exchangeRate?.rate;
  const displayCurrency: SupportedCurrency = currencyScope !== 'all' ? currencyScope : currency;

  const { items, totalSpend } = useMemo(() => {
    return calculateCategoryBreakdown(
      transactions,
      settings,
      settings.goals,
      period,
      mode,
      today,
      currencyScope,
      currency,
      rate,
    );
  }, [transactions, settings, period, mode, today, currencyScope, currency, rate]);

  const CustomPieTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as CategoryBreakdownItem;
      return (
        <div className="bg-popover/95 backdrop-blur-xl border border-border/80 rounded-xl p-2.5 shadow-xl text-xs space-y-1 min-w-32">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            <span>{data.name}</span>
          </div>
          <div className="flex justify-between gap-3 text-muted-foreground tabular-nums">
            <span>{formatCents(data.value, displayCurrency)}</span>
            <span className="font-bold text-foreground">{data.percentage}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="@container min-w-0 p-4 sm:p-6 bg-foreground/5 backdrop-blur-xl border border-border/60 hover:shadow-xl hover:shadow-theme-purple/5 transition-all duration-300 flex flex-col justify-between">
      <div>
        {/* Header & Controls */}
        <div className="flex flex-col @lg:flex-row @lg:items-center @lg:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <PieIcon className="size-4 text-theme-purple shrink-0" />
            <span className="font-semibold text-foreground text-sm tracking-tight truncate">
              {t('dashboard.spendingBreakdown')}
            </span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-foreground/5 border border-border/60 text-muted-foreground shrink-0">
              {displayCurrency}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Switcher: Types vs Goals */}
            <div className="flex items-center p-0.5 rounded-lg bg-foreground/5 border border-border/60">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setMode('types')}
                className={`h-6 px-2.5 text-[11px] font-medium rounded-md transition-all ${
                  mode === 'types'
                    ? 'bg-theme-purple/20 text-theme-purple font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                }`}
              >
                {t('dashboard.byExpenseType')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setMode('goals')}
                className={`h-6 px-2.5 text-[11px] font-medium rounded-md transition-all ${
                  mode === 'goals'
                    ? 'bg-theme-purple/20 text-theme-purple font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                }`}
              >
                {t('dashboard.byBudgetGoal')}
              </Button>
            </div>

            {/* Period Selector Pills */}
            <div className="flex items-center p-0.5 rounded-lg bg-foreground/5 border border-border/60">
              {(['this-month', 'last-month', 'last-90-days'] as const).map(p => (
                <Button
                  key={p}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPeriod(p)}
                  className={`text-[11px] h-6 px-2 rounded-md transition-all ${
                    period === p
                      ? 'bg-foreground/15 text-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                  }`}
                >
                  {p === 'this-month'
                    ? t('dashboard.thisMonth')
                    : p === 'last-month'
                      ? t('dashboard.lastMonth')
                      : t('dashboard.last90Days')}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Spacious Donut Chart & Category List Side-by-Side */}
        {items.length > 0 ? (
          <div className="grid grid-cols-1 @xl:grid-cols-2 gap-6 items-center pt-2">
            {/* Left: Generous Donut Chart */}
            <div className="relative h-56 @xl:h-64 w-full min-w-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={items}
                    cx="50%"
                    cy="50%"
                    innerRadius={68}
                    outerRadius={96}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {items.map(entry => (
                      <Cell key={entry.id} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Total Spend Center Badge */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                <span className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider truncate max-w-full">
                  {t('dashboard.totalSpend')}
                </span>
                <span className="text-xl font-extrabold text-foreground tracking-tight mt-0.5 tabular-nums truncate max-w-full">
                  {formatCents(totalSpend, displayCurrency)}
                </span>
              </div>
            </div>

            {/* Right: Ranked Category List */}
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2 min-w-0">
              {items.map(item => {
                const hasTrend = item.trendPercentage !== undefined;
                const isTrendUp = (item.trendPercentage ?? 0) > 0;
                return (
                  <div key={item.id} className="flex items-center justify-between text-xs gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-foreground font-medium truncate">{item.name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {hasTrend && (
                        <span
                          className={`hidden @xs:inline-flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded border font-medium ${
                            isTrendUp
                              ? 'text-theme-red bg-theme-red/10 border-theme-red/20'
                              : 'text-theme-green bg-theme-green/10 border-theme-green/20'
                          }`}
                        >
                          {isTrendUp ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
                          <span className="tabular-nums">
                            {isTrendUp ? '+' : ''}
                            {item.trendPercentage?.toFixed(0)}%
                          </span>
                        </span>
                      )}
                      <span className="text-muted-foreground min-w-8 text-right font-medium tabular-nums">
                        {item.percentage}%
                      </span>
                      <span className="text-foreground font-semibold min-w-16 text-right tabular-nums whitespace-nowrap">
                        {formatCents(item.value, displayCurrency)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-center p-4">
            <p className="text-muted-foreground text-sm font-medium">{t('dashboard.noSpendingToVisualize')}</p>
            <p className="text-muted-foreground text-xs mt-1 max-w-xs">{t('dashboard.noSpendingDesc')}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
