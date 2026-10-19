import { Card } from '@/components/primitives/card';
import { Button } from '@/components/primitives/button';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { RotateCcw } from 'lucide-react';
import type { GoalCategory } from '@/data/goals';
import { COLOR_CONFIG } from '@/data/settings';
import { useI18n } from '@/i18n';

interface GoalAllocationsDonutProps {
  categories: GoalCategory[];
  totalAllocated: number;
  onResetDefaults: () => void;
}

export function GoalAllocationsDonut({ categories, totalAllocated, onResetDefaults }: GoalAllocationsDonutProps) {
  const { t } = useI18n();

  const pieData = categories.map(c => ({
    name: c.name,
    value: c.percentage,
    color: COLOR_CONFIG[c.color]?.rawHex || '#3b82f6',
  }));

  return (
    <Card className="lg:col-span-5 p-6 bg-foreground/5 backdrop-blur-xl border border-border hover:border-theme-cyan/30 transition-all rounded-2xl shadow-sm flex flex-col justify-between">
      <div>
        <h3 className="text-base font-semibold text-foreground">{t('goals.allocationOverview')}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{t('goals.allocationOverviewDesc')}</p>

        {/* Donut Chart */}
        <div className="relative h-64 w-full my-4 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={68}
                outerRadius={95}
                paddingAngle={3}
                dataKey="value"
                animationDuration={600}
              >
                {categories.map(cat => {
                  const c = COLOR_CONFIG[cat.color];
                  return <Cell key={cat.id} fill={c?.dotColor || '#3b82f6'} />;
                })}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Centered Total Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-foreground tracking-tight">{totalAllocated.toFixed(0)}%</span>
            <span className="text-xs font-medium text-muted-foreground">{t('goals.total')}</span>
          </div>
        </div>

        {/* 2-Column Legend */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-4 border-t border-border/60">
          {categories.map(cat => {
            const c = COLOR_CONFIG[cat.color];
            return (
              <div key={cat.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0 mr-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: c?.dotColor || '#3b82f6' }}
                  />
                  <span className="text-muted-foreground truncate">{cat.name}</span>
                </div>
                <span className="font-semibold text-foreground flex-shrink-0">{cat.percentage}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reset Defaults Button */}
      <div className="pt-6 mt-6 border-t border-border/60">
        <Button
          type="button"
          variant="outline"
          onClick={onResetDefaults}
          className="w-full justify-center gap-2 h-11 border-border bg-foreground/[0.02] text-foreground hover:border-theme-cyan/50 hover:text-theme-cyan hover:shadow-[0_0_15px_var(--shadow-glow-cyan)] rounded-xl transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-muted-foreground" />
          <span>{t('goals.resetDefaults')}</span>
        </Button>
      </div>
    </Card>
  );
}
