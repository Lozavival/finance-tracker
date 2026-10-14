import { useEffect, useState } from 'react';
import { FilterChip } from './FilterChip';
import { FilterPanel } from './FilterPanel';
import { useSettings } from '@/state/SettingsContext';
import { type TransactionTypeConfig } from '@/data/settings';
import { Toggle } from '@/components/ui/toggle';
import { getIcon } from '@/data/icons';
import { COLOR_CONFIG } from '@/data/settings';
import { useI18n } from '@/i18n';

type TypeFilterProps = {
  value: string[];
  onChange: (value: string[]) => void;
};

export function TypeFilter({ value, onChange }: TypeFilterProps) {
  const { incomeTypes, expenseTypes, findType } = useSettings();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(value);

  useEffect(() => {
    if (open) {
      setDraft(value);
    }
  }, [open, value]);

  const active = value.length > 0;
  let label = t('transactions.tableCategory');
  if (value.length === 1) {
    const found = findType(value[0]);
    label = found ? found.name : value[0];
  } else if (value.length > 1) {
    const firstType = findType(value[0]);
    const firstName = firstType ? firstType.name : value[0];
    label = `${firstName} +${value.length - 1}`;
  }

  const renderToggle = (type: TransactionTypeConfig) => {
    const isSelected = draft.includes(type.id);
    const Icon = getIcon(type.icon);
    const colorMeta = COLOR_CONFIG[type.color] ?? COLOR_CONFIG.slate;

    return (
      <Toggle
        key={type.id}
        pressed={isSelected}
        onPressedChange={pressed => {
          if (pressed) {
            setDraft([...draft, type.id]);
          } else {
            setDraft(draft.filter(id => id !== type.id));
          }
        }}
        variant="outline"
        className="rounded-full border-border bg-foreground/5 hover:bg-foreground/10 data-[state=on]:border-cyan-500/40 data-[state=on]:bg-cyan-500/10 data-[state=on]:text-theme-cyan data-[state=on]:hover:bg-cyan-500/20 text-xs px-3 py-1 flex items-center gap-1.5"
      >
        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: colorMeta.dotColor }} />
        <Icon className="w-3.5 h-3.5" />
        <span>{type.name}</span>
      </Toggle>
    );
  };

  return (
    <FilterPanel
      open={open}
      onOpenChange={setOpen}
      title={t('transactions.type')}
      trigger={<FilterChip active={active} label={label} />}
      onApply={() => onChange(draft)}
      onClear={() => onChange([])}
    >
      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t('transactions.directionIncome')}
          </div>
          <div className="flex flex-wrap gap-2">{incomeTypes.map(renderToggle)}</div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t('transactions.directionExpense')}
          </div>
          <div className="flex flex-wrap gap-2">{expenseTypes.map(renderToggle)}</div>
        </div>
      </div>
    </FilterPanel>
  );
}
