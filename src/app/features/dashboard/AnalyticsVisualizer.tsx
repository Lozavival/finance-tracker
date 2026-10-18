import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  type TooltipProps,
} from 'recharts';
import { ArrowLeftRight, Flame } from 'lucide-react';
import { Card } from '@/components/primitives/card';
import { Button } from '@/components/primitives/button';
import { useI18n } from '@/i18n';
import { useSettings } from '@/state/SettingsContext';
import { type Transaction } from '@/data/transactions';
import { type GoalsConfig } from '@/data/goals';
import { type SupportedCurrency } from '@/i18n/types';
import {
  calculateMonthlyCashFlowHistory,
  calculateCumulativeSpendingPace,
  type MonthlyCashFlowPoint,
} from '@/data/analytics';

interface AnalyticsVisualizerProps {
  transactions: Transaction[];
  goalsConfig: GoalsConfig;
  today: Date;
  currencyScope?: 'all' | SupportedCurrency;
}

export function AnalyticsVisualizer({
  transactions,
  goalsConfig,
  today,
  currencyScope = 'all',
}: AnalyticsVisualizerProps) {
  const { t, formatCurrency, locale, currency } = useI18n();
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<'cash-flow' | 'spending-pace'>('cash-flow');
  const [timeframe, setTimeframe] = useState<3 | 6 | 12>(6);

  const rate = settings.exchangeRate?.rate;
  const displayCurrency: SupportedCurrency = currencyScope !== 'all' ? currencyScope : currency;
  const currencySymbol = displayCurrency === 'BRL' ? 'R$' : '$';

  const cashFlowData = useMemo(() => {
    return calculateMonthlyCashFlowHistory(transactions, timeframe, today, locale, currencyScope, currency, rate);
  }, [transactions, timeframe, today, locale, currencyScope, currency, rate]);

  const paceData = useMemo(() => {
    return calculateCumulativeSpendingPace(transactions, goalsConfig, today, currencyScope, currency, rate);
  }, [transactions, goalsConfig, today, currencyScope, currency, rate]);

  const CashFlowTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as MonthlyCashFlowPoint;
      const isPositive = data.netSavings >= 0;
      return (
        <div className="bg-popover/95 backdrop-blur-xl border border-border/80 rounded-xl p-3 shadow-xl text-xs space-y-1.5 min-w-40">
          <p className="font-semibold text-foreground text-sm border-b border-border/60 pb-1">
            {data.label} {data.year}
          </p>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">{t('dashboard.inflow')}:</span>
            <span className="font-medium text-theme-green">+{formatCurrency(data.income, displayCurrency)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">{t('dashboard.outflow')}:</span>
            <span className="font-medium text-theme-red">−{formatCurrency(data.expenses, displayCurrency)}</span>
          </div>
          <div className="flex justify-between gap-4 pt-1 border-t border-border/60 font-semibold">
            <span className="text-foreground">{t('dashboard.netSavings')}:</span>
            <span className={isPositive ? 'text-theme-green' : 'text-theme-red'}>
              {isPositive ? '+' : ''}
              {formatCurrency(data.netSavings, displayCurrency)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const PaceTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const day = payload[0].payload.day as number;
      return (
        <div className="bg-popover/95 backdrop-blur-xl border border-border/80 rounded-xl p-3 shadow-xl text-xs space-y-1.5 min-w-44">
          <p className="font-semibold text-foreground text-sm border-b border-border/60 pb-1">Day {day}</p>
          {payload.map(entry => (
            <div key={entry.name} className="flex justify-between gap-4">
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-semibold" style={{ color: entry.color }}>
                {entry.value !== undefined ? formatCurrency(entry.value, displayCurrency) : '—'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-6 bg-foreground/5 backdrop-blur-xl border border-border/60 hover:shadow-xl hover:shadow-theme-cyan/5 transition-all duration-300">
      {/* Visualizer Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        {/* Tab switch */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-foreground/5 border border-border/60">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('cash-flow')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'cash-flow'
                ? 'bg-theme-cyan/15 text-theme-cyan border border-theme-cyan/30 shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
            }`}
          >
            <ArrowLeftRight className="size-3.5 mr-1.5" />
            {t('dashboard.cashFlowTrends')}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('spending-pace')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'spending-pace'
                ? 'bg-theme-cyan/15 text-theme-cyan border border-theme-cyan/30 shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
            }`}
          >
            <Flame className="size-3.5 mr-1.5" />
            {t('dashboard.spendingPace')}
          </Button>
        </div>

        {/* Controls based on active tab */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-foreground/5 border border-border/60 text-muted-foreground">
            {displayCurrency}
          </span>
          {activeTab === 'cash-flow' ? (
            <div className="flex items-center gap-1">
              {([3, 6, 12] as const).map(count => (
                <Button
                  key={count}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTimeframe(count)}
                  className={`text-xs h-7 px-2.5 rounded-lg border transition-all ${
                    timeframe === count
                      ? 'bg-theme-cyan/20 border-theme-cyan/40 text-theme-cyan font-bold'
                      : 'bg-foreground/5 border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {count === 3
                    ? t('dashboard.months3')
                    : count === 6
                      ? t('dashboard.months6')
                      : t('dashboard.months12')}
                </Button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-theme-cyan inline-block" />
                {t('dashboard.currentMonth')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/60 inline-block" />
                {t('dashboard.previousMonth')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Chart Visualizations */}
      {activeTab === 'cash-flow' ? (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashFlowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
              <XAxis
                dataKey="label"
                stroke="var(--border)"
                tick={{ fill: 'var(--muted-foreground)' }}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--border)"
                tick={{ fill: 'var(--muted-foreground)' }}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={val => `${currencySymbol}${Math.round(val / 1000)}k`}
              />
              <Tooltip content={<CashFlowTooltip />} />
              <Bar
                name={t('dashboard.inflow')}
                dataKey="income"
                fill="var(--theme-green)"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
              <Bar
                name={t('dashboard.outflow')}
                dataKey="expenses"
                fill="var(--theme-red)"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={paceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cyanPaceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--theme-cyan)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--theme-cyan)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
              <XAxis
                dataKey="day"
                stroke="var(--border)"
                tick={{ fill: 'var(--muted-foreground)' }}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={d => `Day ${d}`}
              />
              <YAxis
                stroke="var(--border)"
                tick={{ fill: 'var(--muted-foreground)' }}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={val => `${currencySymbol}${Math.round(val / 1000)}k`}
              />
              <Tooltip content={<PaceTooltip />} />
              <Line
                type="monotone"
                dataKey="previousMonthSpent"
                name={t('dashboard.previousMonth')}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
                strokeWidth={2}
                dot={false}
              />
              {paceData.some(p => p.targetPace !== undefined) && (
                <Line
                  type="linear"
                  dataKey="targetPace"
                  name={t('dashboard.targetBudgetPace')}
                  stroke="var(--theme-blue)"
                  strokeDasharray="2 4"
                  strokeWidth={1.5}
                  dot={false}
                />
              )}
              <Area
                type="monotone"
                dataKey="currentMonthSpent"
                name={t('dashboard.currentMonth')}
                stroke="var(--theme-cyan)"
                strokeWidth={2.5}
                fill="url(#cyanPaceGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
