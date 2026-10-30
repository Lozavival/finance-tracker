import { useState } from 'react';
import { FilterChip } from './FilterChip';
import { FilterPanel } from './FilterPanel';
import { DateField } from '@/components/shared/DateField';
import { Button } from '@/components/primitives/button';
import { PERIOD_PRESETS, PeriodFilter as PeriodFilterType, formatPeriodLabel } from '@/data/transactions';
import { useI18n } from '@/i18n';

export type PeriodFilterProps = {
  value: PeriodFilterType;
  onChange: (value: PeriodFilterType) => void;
};

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PeriodFilterType>(value);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setDraft(value);
    }
  };

  const active = value.kind !== 'up-to-today';
  let label = t('transactions.periodUpToToday');
  if (value.kind === 'preset') {
    label = t('transactions.periodDays', { days: String(value.days) });
  } else if (value.kind === 'custom') {
    label = formatPeriodLabel(value.from, value.to);
  } else if (value.kind === 'all') {
    label = t('transactions.periodIncludeFuture');
  }

  const applyDisabled =
    draft.kind === 'custom' && (!draft.from || !draft.to || draft.from.getTime() > draft.to.getTime());

  return (
    <FilterPanel
      open={open}
      onOpenChange={handleOpenChange}
      title={t('transactions.period')}
      trigger={<FilterChip active={active} label={label} />}
      applyDisabled={applyDisabled}
      onApply={() => onChange(draft)}
      onClear={() => onChange({ kind: 'up-to-today' })}
    >
      <div className="flex gap-2 mb-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`rounded-full flex-1 border-border bg-foreground/5 hover:bg-foreground/10 ${
            draft.kind === 'up-to-today'
              ? 'border-theme-cyan/40 bg-theme-cyan/10 text-theme-cyan hover:bg-theme-cyan/20'
              : 'text-foreground'
          }`}
          onClick={() => setDraft({ kind: 'up-to-today' })}
        >
          {t('transactions.periodUpToToday')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`rounded-full flex-1 border-border bg-foreground/5 hover:bg-foreground/10 ${
            draft.kind === 'all'
              ? 'border-theme-cyan/40 bg-theme-cyan/10 text-theme-cyan hover:bg-theme-cyan/20'
              : 'text-foreground'
          }`}
          onClick={() => setDraft({ kind: 'all' })}
        >
          {t('transactions.periodAll')}
        </Button>
      </div>

      <div className="flex gap-2 mb-4">
        {PERIOD_PRESETS.map(days => (
          <Button
            key={days}
            type="button"
            variant="outline"
            size="sm"
            className={`rounded-full flex-1 border-border bg-foreground/5 hover:bg-foreground/10 ${
              draft.kind === 'preset' && draft.days === days
                ? 'border-theme-cyan/40 bg-theme-cyan/10 text-theme-cyan hover:bg-theme-cyan/20'
                : 'text-foreground'
            }`}
            onClick={() => setDraft({ kind: 'preset', days })}
          >
            {t('transactions.periodDays', { days: String(days) })}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        <div className="text-sm font-medium text-foreground">{t('transactions.periodCustom')}</div>
        <div className="space-y-2">
          <DateField
            placeholder={t('transactions.startDate')}
            value={draft.kind === 'custom' ? draft.from : undefined}
            onChange={date =>
              setDraft(prev => ({
                kind: 'custom',
                from: date,
                to: prev.kind === 'custom' ? prev.to : date,
              }))
            }
            disabledDays={d => {
              if (draft.kind !== 'custom' || !draft.to) return false;
              return d.getTime() > draft.to.getTime();
            }}
          />
          <DateField
            placeholder={t('transactions.endDate')}
            value={draft.kind === 'custom' ? draft.to : undefined}
            onChange={date =>
              setDraft(prev => ({
                kind: 'custom',
                from: prev.kind === 'custom' ? prev.from : date,
                to: date,
              }))
            }
            disabledDays={d => {
              if (draft.kind !== 'custom' || !draft.from) return false;
              return d.getTime() < draft.from.getTime();
            }}
          />
        </div>
      </div>
    </FilterPanel>
  );
}
