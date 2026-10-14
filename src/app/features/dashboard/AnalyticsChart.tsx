import { Card } from '@/components/primitives/card';
import { Button } from '@/components/primitives/button';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useState } from 'react';
import { type CategoryTotal } from '@/data/transactions';
import { useI18n } from '@/i18n';

const revenueData = {
  '7D': [
    { date: 'Mon', value: 12400 },
    { date: 'Tue', value: 13200 },
    { date: 'Wed', value: 11800 },
    { date: 'Thu', value: 14500 },
    { date: 'Fri', value: 13900 },
    { date: 'Sat', value: 15200 },
    { date: 'Sun', value: 14800 },
  ],
  '1M': [
    { date: 'Week 1', value: 45000 },
    { date: 'Week 2', value: 52000 },
    { date: 'Week 3', value: 48000 },
    { date: 'Week 4', value: 58000 },
  ],
  '1Y': [
    { date: 'Jan', value: 45000 },
    { date: 'Feb', value: 52000 },
    { date: 'Mar', value: 48000 },
    { date: 'Apr', value: 61000 },
    { date: 'May', value: 55000 },
    { date: 'Jun', value: 67000 },
    { date: 'Jul', value: 72000 },
    { date: 'Aug', value: 68000 },
    { date: 'Sep', value: 75000 },
    { date: 'Oct', value: 82000 },
    { date: 'Nov', value: 78000 },
    { date: 'Dec', value: 85000 },
  ],
};

type SpendingByCategoryChartProps = {
  data: CategoryTotal[];
  totalSpend: number;
  secondaryLabel?: string;
  secondaryValue?: string;
  tertiaryLabel?: string;
  tertiaryValue?: string;
  className?: string;
};

export function SpendingByCategoryChart({
  data,
  totalSpend,
  secondaryLabel,
  secondaryValue,
  tertiaryLabel,
  tertiaryValue,
  className = '',
}: SpendingByCategoryChartProps) {
  const { t, formatCurrency } = useI18n();

  return (
    <Card
      className={`p-6 bg-foreground/5 backdrop-blur-xl border border-purple-500/30 hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300 ${className}`}
    >
      <div className="text-foreground text-lg">{t('dashboard.spendingByCategory')}</div>

      {data.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {data.map(entry => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('dashboard.totalSpend')}</span>
              <span className="text-foreground">{formatCurrency(totalSpend)}</span>
            </div>
            {secondaryLabel && secondaryValue && (
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">{secondaryLabel}</span>
                <span className="text-theme-cyan text-right">{secondaryValue}</span>
              </div>
            )}
            {tertiaryLabel && tertiaryValue && (
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">{tertiaryLabel}</span>
                <span className="text-theme-purple text-right">{tertiaryValue}</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-border space-y-2">
            {data.map(category => (
              <div key={category.name} className="flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-3 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                  <span className="text-muted-foreground truncate">{category.name}</span>
                </div>
                <span className="text-foreground">{formatCurrency(category.value)}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="min-h-64 flex flex-col items-center justify-center text-center">
          <div className="text-muted-foreground mb-1">{t('dashboard.noSpendingToVisualize')}</div>
          <div className="text-muted-foreground text-sm max-w-xs">{t('dashboard.noSpendingDesc')}</div>
        </div>
      )}
    </Card>
  );
}

export function AnalyticsChart() {
  const { t, formatCurrency } = useI18n();
  const [timePeriod, setTimePeriod] = useState<'7D' | '1M' | '1Y'>('1M');

  const categoryData: CategoryTotal[] = [
    { typeId: 'shopping', name: t('defaults.types.shopping'), value: 4500, color: 'var(--color-cyan-dot)' },
    { typeId: 'food-dining', name: t('defaults.types.foodDining'), value: 3200, color: 'var(--color-blue-dot)' },
    {
      typeId: 'transportation',
      name: t('defaults.types.transportation'),
      value: 2100,
      color: 'var(--color-violet-dot)',
    },
    { typeId: 'entertainment', name: t('defaults.types.entertainment'), value: 1800, color: 'var(--color-pink-dot)' },
    { typeId: 'bills', name: t('defaults.types.bills'), value: 2800, color: 'var(--color-amber-dot)' },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover/95 backdrop-blur-xl border border-cyan-500/50 rounded-lg p-3 shadow-lg shadow-cyan-500/20">
          <p className="text-muted-foreground text-sm">{payload[0].payload.date}</p>
          <p className="text-theme-cyan">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Revenue Chart - Takes 2 columns */}
      <Card className="lg:col-span-2 p-6 bg-foreground/5 backdrop-blur-xl border border-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/20 transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <div role="heading" aria-level={2} className="text-foreground text-lg">
            {t('dashboard.revenueGrowth')}
          </div>
          <div className="flex gap-2">
            {(['7D', '1M', '1Y'] as const).map(period => (
              <Button
                key={period}
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={timePeriod === period}
                onClick={() => setTimePeriod(period)}
                className={`rounded-lg transition-all duration-300 ${
                  timePeriod === period
                    ? 'bg-cyan-500/30 border-cyan-400/50 text-theme-cyan shadow-md shadow-cyan-500/20 hover:bg-cyan-500/30 hover:text-theme-cyan'
                    : 'bg-foreground/5 border border-border text-muted-foreground hover:border-cyan-400/30'
                }`}
              >
                {period}
              </Button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={revenueData[timePeriod]}>
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-cyan-500)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-green-500)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" opacity={0.5} />
            <XAxis dataKey="date" stroke="currentColor" className="text-muted-foreground" />
            <YAxis stroke="currentColor" className="text-muted-foreground" />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="url(#lineGradient)"
              strokeWidth={3}
              fill="url(#colorGradient)"
            />
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--color-cyan-500)" />
                <stop offset="100%" stopColor="var(--color-green-500)" />
              </linearGradient>
            </defs>
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <SpendingByCategoryChart
        data={categoryData}
        totalSpend={14400}
        secondaryLabel={t('dashboard.topMerchant')}
        secondaryValue="Amazon"
        tertiaryLabel={t('dashboard.topCountry')}
        tertiaryValue={t('dashboard.topCountryValue')}
      />
    </div>
  );
}
