import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/primitives/toggle-group';
import { Label } from '@/components/primitives/label';
import { useI18n } from '@/i18n';

export type DialogMode = 'income' | 'expense' | 'transfer';

type DirectionToggleProps = {
  value: DialogMode;
  onChange: (value: DialogMode) => void;
};

export function DirectionToggle({ value, onChange }: DirectionToggleProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground">{t('transactions.directionLabel')}</Label>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={nextValue => {
          if (nextValue) onChange(nextValue as DialogMode);
        }}
        aria-label={t('transactions.directionLabel')}
        className="w-full rounded-xl border border-border bg-muted/40 p-1"
      >
        <ToggleGroupItem
          value="income"
          aria-label={t('transactions.directionIncome')}
          className="h-11 rounded-lg text-muted-foreground transition-all data-[state=on]:bg-background data-[state=on]:text-emerald-400 data-[state=on]:shadow-sm"
        >
          <ArrowDownLeft className="mr-2 h-4 w-4" />
          {t('transactions.directionIncome')}
        </ToggleGroupItem>
        <ToggleGroupItem
          value="expense"
          aria-label={t('transactions.directionExpense')}
          className="h-11 rounded-lg text-muted-foreground transition-all data-[state=on]:bg-background data-[state=on]:text-red-400 data-[state=on]:shadow-sm"
        >
          <ArrowUpRight className="mr-2 h-4 w-4" />
          {t('transactions.directionExpense')}
        </ToggleGroupItem>
        <ToggleGroupItem
          value="transfer"
          aria-label={t('transactions.directionTransfer')}
          className="h-11 rounded-lg text-muted-foreground transition-all data-[state=on]:bg-background data-[state=on]:text-indigo-400 data-[state=on]:shadow-sm"
        >
          <ArrowLeftRight className="mr-2 h-4 w-4" />
          {t('transactions.directionTransfer')}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
