import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { type DailyBalance } from '@/data/ledger';
import { formatShort } from '@/data/dates';
import { useI18n } from '@/i18n';

export function BalanceProjectionChart({ series, today }: { series: DailyBalance[]; today: Date }) {
  const { t, formatCurrency, locale } = useI18n();
  if (series.length === 0) return null;

  const chartData = series.map(s => ({ ...s, dateStr: formatShort(s.date, locale) }));
  const todayStr = formatShort(today, locale);

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 25, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-cyan-500)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-cyan-500)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-cyan-500)" stopOpacity={0.1} />
              <stop offset="95%" stopColor="var(--color-cyan-500)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-red-500)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-red-500)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="dateStr"
            stroke="var(--border)"
            tick={{ fill: 'var(--muted-foreground)' }}
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={v => formatCurrency(v / 100)}
            stroke="var(--border)"
            tick={{ fill: 'var(--muted-foreground)' }}
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(val: number) => formatCurrency(val / 100)}
            contentStyle={{
              backgroundColor: 'color-mix(in srgb, var(--background) 40%, transparent)',
              border: '1px solid var(--foreground)',
              borderRadius: '8px',
            }}
            labelStyle={{ color: 'var(--foreground)', fontWeight: 500, marginBottom: '4px' }}
          />
          <ReferenceLine
            x={todayStr}
            stroke="var(--muted-foreground)"
            strokeDasharray="3 3"
            label={{ position: 'top', value: t('common.today'), fill: 'var(--muted-foreground)', fontSize: 12 }}
          />

          <Area
            type="monotone"
            dataKey="actual"
            stroke="var(--color-cyan-500)"
            fillOpacity={1}
            fill="url(#colorActual)"
            isAnimationActive={false}
          />
          <Area
            type="stepAfter"
            dataKey="projected"
            stroke="var(--color-cyan-500)"
            strokeDasharray="5 5"
            fillOpacity={1}
            fill="url(#colorProjected)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
