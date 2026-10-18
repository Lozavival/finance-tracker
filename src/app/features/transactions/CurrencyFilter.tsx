import { useState } from 'react';
import { FilterChip } from '@/components/shared/filters/FilterChip';
import { FilterPanel } from '@/components/shared/filters/FilterPanel';
import { Toggle } from '@/components/primitives/toggle';
import { type SupportedCurrency } from '@/i18n/types';
import { useI18n } from '@/i18n';

type CurrencyFilterProps = {
  value: 'all' | SupportedCurrency;
  onChange: (value: 'all' | SupportedCurrency) => void;
};

export function CurrencyFilter({ value, onChange }: CurrencyFilterProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<'all' | SupportedCurrency>(value);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setDraft(value);
    }
  };

  const active = value !== 'all';
  let label = t('transactions.filterCurrency');
  if (value === 'BRL') label = 'BRL (R$)';
  if (value === 'USD') label = 'USD ($)';

  return (
    <FilterPanel
      open={open}
      onOpenChange={handleOpenChange}
      title={t('transactions.filterCurrency')}
      trigger={<FilterChip active={active} label={label} />}
      onApply={() => onChange(draft)}
      onClear={() => onChange('all')}
    >
      <div className="flex gap-2">
        <Toggle
          pressed={draft === 'BRL'}
          onPressedChange={pressed => setDraft(pressed ? 'BRL' : 'all')}
          variant="outline"
          className="flex-1 rounded-full border-border bg-foreground/5 hover:bg-foreground/10 data-[state=on]:border-theme-cyan/40 data-[state=on]:bg-theme-cyan/10 data-[state=on]:text-theme-cyan data-[state=on]:hover:bg-theme-cyan/20"
        >
          BRL (R$)
        </Toggle>
        <Toggle
          pressed={draft === 'USD'}
          onPressedChange={pressed => setDraft(pressed ? 'USD' : 'all')}
          variant="outline"
          className="flex-1 rounded-full border-border bg-foreground/5 hover:bg-foreground/10 data-[state=on]:border-theme-cyan/40 data-[state=on]:bg-theme-cyan/10 data-[state=on]:text-theme-cyan data-[state=on]:hover:bg-theme-cyan/20"
        >
          USD ($)
        </Toggle>
      </div>
    </FilterPanel>
  );
}
