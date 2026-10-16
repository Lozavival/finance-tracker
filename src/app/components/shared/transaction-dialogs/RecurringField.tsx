import { Repeat } from 'lucide-react';
import { Switch } from '@/components/primitives/switch';
import { Label } from '@/components/primitives/label';
import { Input } from '@/components/primitives/input';
import { Button } from '@/components/primitives/button';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

export type RecurringFieldProps = {
  isRecurring: boolean;
  onRecurringChange: (recurring: boolean) => void;
  limitKind: 'infinite' | 'count';
  onLimitKindChange: (kind: 'infinite' | 'count') => void;
  count: number | '';
  onCountChange: (count: number | '') => void;
};

export function RecurringField({
  isRecurring,
  onRecurringChange,
  limitKind,
  onLimitKindChange,
  count,
  onCountChange,
}: RecurringFieldProps) {
  const { t } = useI18n();

  return (
    <div className="sm:col-span-2 rounded-xl border border-border/80 bg-foreground/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="text-sm font-medium text-foreground flex items-center gap-2">
            <Repeat className="w-4 h-4 text-theme-cyan" />
            <span>{t('transactions.repeatMonthly')}</span>
          </div>
          <p className="text-xs text-muted-foreground">{t('transactions.repeatMonthlyDesc')}</p>
        </div>
        <Switch checked={isRecurring} onCheckedChange={onRecurringChange} />
      </div>

      {isRecurring && (
        <div className="pt-2 border-t border-border/50 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t('transactions.duration')}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onLimitKindChange('infinite')}
                className={cn(
                  'h-8 text-xs transition-all',
                  limitKind === 'infinite'
                    ? 'bg-theme-cyan/20 border-theme-cyan/40 text-theme-cyan font-medium hover:bg-theme-cyan/25 hover:text-theme-cyan'
                    : 'border-border bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground',
                )}
              >
                {t('transactions.ongoing')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onLimitKindChange('count')}
                className={cn(
                  'h-8 text-xs transition-all',
                  limitKind === 'count'
                    ? 'bg-theme-cyan/20 border-theme-cyan/40 text-theme-cyan font-medium hover:bg-theme-cyan/25 hover:text-theme-cyan'
                    : 'border-border bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground',
                )}
              >
                {t('transactions.fixedCount')}
              </Button>
            </div>
          </div>

          {limitKind === 'count' && (
            <div className="space-y-1.5">
              <Label htmlFor="recurring-count" className="text-xs text-muted-foreground">
                {t('transactions.numberOfMonths')}
              </Label>
              <Input
                id="recurring-count"
                type="number"
                min="1"
                max="48"
                value={count}
                onChange={e =>
                  onCountChange(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                className="h-8 border-border bg-foreground/5 text-foreground"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
