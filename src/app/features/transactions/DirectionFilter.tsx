import { useState } from 'react';
import { FilterChip } from '@/components/shared/filters/FilterChip';
import { FilterPanel } from '@/components/shared/filters/FilterPanel';
import { TransactionDirection } from '@/data/transactions';
import { Toggle } from '@/components/primitives/toggle';
import { useI18n } from '@/i18n';

type DirectionFilterProps = {
  value: 'all' | TransactionDirection;
  onChange: (value: 'all' | TransactionDirection) => void;
};

export function DirectionFilter({ value, onChange }: DirectionFilterProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<'all' | TransactionDirection>(value);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setDraft(value);
    }
  };

  const active = value !== 'all';
  let label = t('transactions.direction');
  if (value === 'income') label = t('transactions.directionIncome');
  if (value === 'expense') label = t('transactions.directionExpense');

  return (
    <FilterPanel
      open={open}
      onOpenChange={handleOpenChange}
      title={t('transactions.direction')}
      trigger={<FilterChip active={active} label={label} />}
      onApply={() => onChange(draft)}
      onClear={() => onChange('all')}
    >
      <div className="flex gap-2">
        <Toggle
          pressed={draft === 'income'}
          onPressedChange={pressed => setDraft(pressed ? 'income' : 'all')}
          variant="outline"
          className={`flex-1 rounded-full border-border bg-foreground/5 hover:bg-foreground/10 data-[state=on]:border-theme-cyan/40 data-[state=on]:bg-theme-cyan/10 data-[state=on]:text-theme-cyan data-[state=on]:hover:bg-theme-cyan/20`}
        >
          {t('transactions.directionIncome')}
        </Toggle>
        <Toggle
          pressed={draft === 'expense'}
          onPressedChange={pressed => setDraft(pressed ? 'expense' : 'all')}
          variant="outline"
          className={`flex-1 rounded-full border-border bg-foreground/5 hover:bg-foreground/10 data-[state=on]:border-theme-cyan/40 data-[state=on]:bg-theme-cyan/10 data-[state=on]:text-theme-cyan data-[state=on]:hover:bg-theme-cyan/20`}
        >
          {t('transactions.directionExpense')}
        </Toggle>
      </div>
    </FilterPanel>
  );
}
