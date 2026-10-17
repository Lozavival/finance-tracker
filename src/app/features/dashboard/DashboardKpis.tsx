import { useState } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Target,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/primitives/card';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/primitives/popover';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { useI18n } from '@/i18n';
import { type DashboardKpis, type SmartFinancialSignal } from '@/data/analytics';
import { SmartInsightsContent } from './SmartInsightsContent';

interface DashboardKpisProps {
  kpis: DashboardKpis;
  signals: SmartFinancialSignal[];
}

export function DashboardKpisSection({ kpis, signals }: DashboardKpisProps) {
  const { t, formatCurrency } = useI18n();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const activeSignals = signals.filter(s => !dismissedIds.has(s.id));
  const activeCount = activeSignals.length;

  const isBalanceUp = kpis.balanceChangePercentage >= 0;
  const isCashFlowPositive = kpis.netSavings >= 0;
  const isBudgetPacingGood = kpis.budgetPercentUsed <= kpis.monthProgressPercent;

  function handleDismiss(id: string) {
    setDismissedIds(prev => new Set(prev).add(id));
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* 1. Total Net Balance */}
      <Card
        className="p-6 bg-foreground/5 backdrop-blur-xl border border-theme-cyan/30 
                   hover:shadow-[0_0_25px_var(--shadow-glow-cyan)] transition-all duration-300 relative overflow-hidden group"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-11 h-11 rounded-xl bg-theme-cyan/15 border border-theme-cyan/30 flex items-center justify-center text-theme-cyan">
            <Wallet className="size-5" />
          </div>
          <div
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border ${
              isBalanceUp
                ? 'bg-theme-green/10 text-theme-green border-theme-green/30'
                : 'bg-theme-red/10 text-theme-red border-theme-red/30'
            }`}
          >
            {isBalanceUp ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            <span>
              {isBalanceUp ? '+' : ''}
              {kpis.balanceChangePercentage.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium mb-1">
            {t('dashboard.netLiquidBalance')}
          </p>
          <p className="text-foreground text-2xl font-bold tracking-tight mb-1">{formatCurrency(kpis.totalBalance)}</p>
          <p className="text-xs text-muted-foreground">{t('dashboard.vsLastMonth')}</p>
        </div>
      </Card>

      {/* 2. Monthly Cash Flow */}
      <Card
        className="p-6 bg-foreground/5 backdrop-blur-xl border border-theme-green/30 
                   hover:shadow-[0_0_25px_var(--shadow-glow-green)] transition-all duration-300 relative overflow-hidden group"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-11 h-11 rounded-xl bg-theme-green/15 border border-theme-green/30 flex items-center justify-center text-theme-green">
            {isCashFlowPositive ? <TrendingUp className="size-5" /> : <TrendingDown className="size-5" />}
          </div>
          <div className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-foreground/5 text-muted-foreground border border-border/60">
            <span>
              {kpis.savingsRate.toFixed(1)}% {t('dashboard.savingsRate')}
            </span>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium mb-1">
            {t('dashboard.monthlyCashFlow')}
          </p>
          <p
            className={`text-2xl font-bold tracking-tight mb-1 ${
              isCashFlowPositive ? 'text-theme-green' : 'text-theme-red'
            }`}
          >
            {isCashFlowPositive ? '+' : ''}
            {formatCurrency(kpis.netSavings)}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {t('dashboard.inflow')}: {formatCurrency(kpis.monthlyInflow)}
            </span>
            <span>
              {t('dashboard.outflow')}: {formatCurrency(kpis.monthlyOutflow)}
            </span>
          </div>
        </div>
      </Card>

      {/* 3. Budget Status & Pacing */}
      <Card
        className="p-6 bg-foreground/5 backdrop-blur-xl border border-theme-blue/30 
                   hover:shadow-[0_0_25px_var(--shadow-glow-blue)] transition-all duration-300 relative overflow-hidden group"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-11 h-11 rounded-xl bg-theme-blue/15 border border-theme-blue/30 flex items-center justify-center text-theme-blue">
            <Target className="size-5" />
          </div>
          <div
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border ${
              isBudgetPacingGood
                ? 'bg-theme-green/10 text-theme-green border-theme-green/30'
                : 'bg-theme-orange/10 text-theme-orange border-theme-orange/30'
            }`}
          >
            <span>{isBudgetPacingGood ? t('dashboard.onTrack') : t('dashboard.aheadOfPace')}</span>
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-1">
            <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">
              {t('dashboard.budgetStatus')}
            </p>
            <span className="text-xs font-bold text-foreground">{kpis.budgetPercentUsed.toFixed(0)}%</span>
          </div>
          <p className="text-foreground text-2xl font-bold tracking-tight mb-2">
            {formatCurrency(kpis.budgetSpent)}
            <span className="text-xs font-normal text-muted-foreground ml-1.5">
              / {formatCurrency(kpis.budgetBase)}
            </span>
          </p>
          <ProgressBar
            value={Math.min(kpis.budgetPercentUsed, 100)}
            color={isBudgetPacingGood ? 'var(--theme-blue)' : 'var(--theme-orange)'}
            className="h-1.5 mb-2"
          />
          <p className="text-[11px] text-muted-foreground">
            {t('dashboard.budgetPacing', {
              day: String(kpis.dayOfMonth),
              total: String(kpis.daysInMonth),
              percent: String(Math.round(kpis.monthProgressPercent)),
            })}
          </p>
        </div>
      </Card>

      {/* 4. Smart Insights Signal Count & Interactive Popover */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Card
            role="button"
            tabIndex={0}
            aria-label={t('dashboard.financialSignals')}
            className="p-6 bg-foreground/5 backdrop-blur-xl border border-theme-orange/30 
                       hover:shadow-[0_0_25px_var(--shadow-glow-orange)] hover:border-theme-orange/50 
                       transition-all duration-300 relative overflow-hidden group cursor-pointer text-left select-none"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-theme-orange/15 border border-theme-orange/30 flex items-center justify-center text-theme-orange">
                <Sparkles className="size-5" />
              </div>
              <div
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border ${
                  activeCount > 0
                    ? 'bg-theme-orange/10 text-theme-orange border-theme-orange/30'
                    : 'bg-theme-green/10 text-theme-green border-theme-green/30'
                }`}
              >
                <span>{activeCount > 0 ? `${activeCount} ${t('common.warning')}(s)` : t('common.success')}</span>
              </div>
            </div>

            <div className="relative z-10">
              <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium mb-1">
                {t('dashboard.financialSignals')}
              </p>
              <p className="text-foreground text-2xl font-bold tracking-tight mb-1">
                {activeCount > 0
                  ? t('dashboard.activeAlertsCount', { count: String(activeCount) })
                  : t('dashboard.noActiveAlerts')}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                <span>{activeCount > 0 ? t('dashboard.clickToViewSignals') : t('dashboard.allSystemsNominal')}</span>
                <ChevronRight className="size-3.5 text-theme-orange group-hover:translate-x-0.5 transition-transform shrink-0" />
              </div>
            </div>
          </Card>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-[calc(100vw-2rem)] sm:w-[440px] max-h-[500px] overflow-y-auto p-4 bg-popover/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl space-y-3 z-50"
        >
          <SmartInsightsContent
            signals={activeSignals}
            onDismiss={handleDismiss}
            onClose={() => setPopoverOpen(false)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
