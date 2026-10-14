import { useEffect, useState } from 'react';
import { FilterChip } from './FilterChip';
import { FilterPanel } from './FilterPanel';
import { useSettings } from '@/state/SettingsContext';
import { type PaymentMethodConfig } from '@/data/settings';
import { Toggle } from '@/components/ui/toggle';
import { getIcon } from '@/data/icons';
import { useI18n } from '@/i18n';

type PaymentFilterProps = {
  value: string[];
  onChange: (value: string[]) => void;
};

export function PaymentFilter({ value, onChange }: PaymentFilterProps) {
  const { settings, findMethod } = useSettings();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(value);

  useEffect(() => {
    if (open) {
      setDraft(value);
    }
  }, [open, value]);

  const active = value.length > 0;
  let label = t('transactions.payment');
  if (value.length === 1) {
    const m = findMethod(value[0]);
    label = m ? m.name : value[0];
  } else if (value.length > 1) {
    const firstMethod = findMethod(value[0]);
    const firstName = firstMethod ? firstMethod.name : value[0];
    label = `${firstName} +${value.length - 1}`;
  }

  const renderToggle = (payment: PaymentMethodConfig) => {
    const isSelected = draft.includes(payment.id);
    const Icon = getIcon(payment.icon);

    return (
      <Toggle
        key={payment.id}
        pressed={isSelected}
        onPressedChange={pressed => {
          if (pressed) {
            setDraft([...draft, payment.id]);
          } else {
            setDraft(draft.filter(id => id !== payment.id));
          }
        }}
        variant="outline"
        className="rounded-full border-border bg-foreground/5 hover:bg-foreground/10 data-[state=on]:border-cyan-500/40 data-[state=on]:bg-cyan-500/10 data-[state=on]:text-theme-cyan data-[state=on]:hover:bg-cyan-500/20 text-xs px-3 py-1 flex items-center gap-1.5"
      >
        <Icon className="w-3.5 h-3.5" />
        <span>{payment.name}</span>
      </Toggle>
    );
  };

  return (
    <FilterPanel
      open={open}
      onOpenChange={setOpen}
      title={t('transactions.paymentMethod')}
      trigger={<FilterChip active={active} label={label} />}
      onApply={() => onChange(draft)}
      onClear={() => onChange([])}
    >
      <div className="flex flex-wrap gap-2">{settings.paymentMethods.map(renderToggle)}</div>
    </FilterPanel>
  );
}
