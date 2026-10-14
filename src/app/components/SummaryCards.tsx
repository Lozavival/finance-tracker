import { TrendingUp, DollarSign, Activity, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/primitives/card';
import { useI18n, type TranslationKey } from '@/i18n';

interface SummaryItemDef {
  key: TranslationKey;
  amount?: number;
  count?: number;
  rawString?: string;
  change: string;
  changeKey?: TranslationKey;
  icon: typeof DollarSign;
  color: 'cyan' | 'green' | 'blue' | 'orange';
  chartData: number[];
}

const summaryDefs: SummaryItemDef[] = [
  {
    key: 'dashboard.totalBalance',
    amount: 124592.0,
    change: '+12.5%',
    icon: DollarSign,
    color: 'cyan',
    chartData: [40, 45, 42, 48, 52, 55, 58],
  },
  {
    key: 'dashboard.monthlyRevenue',
    amount: 45231.89,
    change: '+20.1%',
    icon: TrendingUp,
    color: 'green',
    chartData: [30, 35, 32, 40, 45, 43, 50],
  },
  {
    key: 'dashboard.newTransactions',
    count: 1234,
    change: '+8.3%',
    icon: Activity,
    color: 'blue',
    chartData: [25, 28, 30, 27, 32, 35, 38],
  },
  {
    key: 'dashboard.aiAlerts',
    count: 3,
    change: '2 High Risk',
    changeKey: 'dashboard.highRiskAlerts',
    icon: AlertTriangle,
    color: 'orange',
    chartData: [5, 4, 6, 3, 2, 4, 3],
  },
];

export function SummaryCards() {
  const { t, formatCurrency, formatNumber } = useI18n();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {summaryDefs.map((item, index) => {
        const Icon = item.icon;
        const displayValue =
          item.amount !== undefined
            ? formatCurrency(item.amount)
            : item.count !== undefined
              ? formatNumber(item.count)
              : item.rawString;
        const displayChange = item.changeKey ? t(item.changeKey) : item.change;
        const colorClasses = {
          cyan: {
            border: 'border-cyan-500/30',
            shadow: 'hover:shadow-[0_0_25px_var(--shadow-glow-cyan)]',
            iconBg: 'bg-cyan-500/20',
            iconColor: 'text-theme-cyan',
            textColor: 'text-theme-cyan',
          },
          green: {
            border: 'border-green-500/30',
            shadow: 'hover:shadow-[0_0_25px_var(--shadow-glow-green)]',
            iconBg: 'bg-green-500/20',
            iconColor: 'text-theme-green',
            textColor: 'text-theme-green',
          },
          blue: {
            border: 'border-blue-500/30',
            shadow: 'hover:shadow-[0_0_25px_var(--shadow-glow-blue)]',
            iconBg: 'bg-blue-500/20',
            iconColor: 'text-theme-blue',
            textColor: 'text-theme-blue',
          },
          orange: {
            border: 'border-orange-500/30',
            shadow: 'hover:shadow-[0_0_25px_var(--shadow-glow-orange)]',
            iconBg: 'bg-orange-500/20',
            iconColor: 'text-theme-orange',
            textColor: 'text-theme-orange',
          },
        };

        const colors = colorClasses[item.color as keyof typeof colorClasses];

        return (
          <Card
            key={index}
            className={`p-6 bg-foreground/5 backdrop-blur-xl border ${colors.border} 
                       ${colors.shadow} transition-all duration-300 group relative overflow-hidden`}
          >
            {/* Background glow effect */}
            <div
              className={`absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-20 blur-3xl
                         bg-gradient-to-br from-${item.color}-400 to-transparent
                         group-hover:opacity-30 transition-opacity`}
            />

            {/* Icon */}
            <div className={`w-12 h-12 rounded-lg ${colors.iconBg} flex items-center justify-center mb-4`}>
              <Icon className={`w-6 h-6 ${colors.iconColor}`} />
            </div>

            {/* Content */}
            <div className="relative z-10">
              <p className="text-muted-foreground text-sm mb-1">{t(item.key)}</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-foreground text-2xl mb-1">{displayValue}</p>
                  <p className={`text-sm ${colors.textColor}`}>{displayChange}</p>
                </div>

                {/* Mini Chart */}
                <div className="flex items-end gap-1 h-12">
                  {item.chartData.map((height, i) => (
                    <div
                      key={i}
                      className={`w-1.5 bg-gradient-to-t from-${item.color}-600 to-${item.color}-400 rounded-full transition-all duration-300`}
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
