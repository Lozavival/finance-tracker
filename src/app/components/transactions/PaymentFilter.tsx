import { useEffect, useState } from 'react';
import { FilterChip } from './FilterChip';
import { FilterPanel } from './FilterPanel';
import { PAYMENT_METHODS, PaymentMethod } from '../../data/transactions';
import { Toggle } from '../ui/toggle';

type PaymentFilterProps = {
  value: PaymentMethod[];
  onChange: (value: PaymentMethod[]) => void;
};

export function PaymentFilter({ value, onChange }: PaymentFilterProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PaymentMethod[]>(value);

  useEffect(() => {
    if (open) {
      setDraft(value);
    }
  }, [open, value]);

  const active = value.length > 0;
  let label = 'Payment';
  if (value.length === 1) {
    label = value[0];
  } else if (value.length > 1) {
    label = `${value[0]} +${value.length - 1}`;
  }

  const renderToggle = (payment: PaymentMethod) => {
    const isSelected = draft.includes(payment);
    return (
      <Toggle
        key={payment}
        pressed={isSelected}
        onPressedChange={pressed => {
          if (pressed) {
            setDraft([...draft, payment]);
          } else {
            setDraft(draft.filter(t => t !== payment));
          }
        }}
        variant="outline"
        className="rounded-full border-border bg-foreground/5 hover:bg-foreground/10 data-[state=on]:border-cyan-500/40 data-[state=on]:bg-cyan-500/10 data-[state=on]:text-theme-cyan data-[state=on]:hover:bg-cyan-500/20"
      >
        {payment}
      </Toggle>
    );
  };

  return (
    <FilterPanel
      open={open}
      onOpenChange={setOpen}
      title="Payment method"
      trigger={<FilterChip active={active} label={label} />}
      onApply={() => onChange(draft)}
      onClear={() => onChange([])}
    >
      <div className="flex flex-wrap gap-2">{PAYMENT_METHODS.map(renderToggle)}</div>
    </FilterPanel>
  );
}
