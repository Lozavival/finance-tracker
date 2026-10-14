import { useEffect, useState } from 'react';
import { FilterChip } from './FilterChip';
import { FilterPanel } from './FilterPanel';
import { DateField } from '@/components/shared/DateField';
import { Button } from '@/components/primitives/button';
import { PERIOD_PRESETS, PeriodFilter as PeriodFilterType, formatPeriodLabel } from '@/data/transactions';
import { useI18n } from '@/i18n';

type PeriodFilterProps = {
  value: PeriodFilterType;
  onChange: (value: PeriodFilterType) => void;
};

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PeriodFilterType>(value);

  // Reset draft when opening
  useEffect(() => {
    if (open) {
      setDraft(value);
    }
  }, [open, value]);

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
      onOpenChange={setOpen}
      title={t('transactions.period')}
      trigger={<FilterChip active={active} label={label} />}
      onApply={() => onChange(draft)}
      onClear={() => onChange({ kind: 'up-to-today' })}
      applyDisabled={applyDisabled}
    >
      <div className="flex gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDraft({ kind: 'up-to-today' })}
          className={`rounded-full flex-1 border-border bg-foreground/5 hover:bg-foreground/10 ${
            draft.kind === 'up-to-today'
              ? 'border-cyan-500/40 bg-cyan-500/10 text-theme-cyan hover:bg-cyan-500/20'
              : 'text-foreground'
          }`}
        >
          {t('transactions.periodUpToToday')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDraft({ kind: 'all' })}
          className={`rounded-full flex-1 border-border bg-foreground/5 hover:bg-foreground/10 ${
            draft.kind === 'all'
              ? 'border-cyan-500/40 bg-cyan-500/10 text-theme-cyan hover:bg-cyan-500/20'
              : 'text-foreground'
          }`}
        >
          {t('transactions.periodIncludeFuture')}
        </Button>
      </div>

      <div className="flex gap-2 mb-6">
        {PERIOD_PRESETS.map(days => (
          <Button
            key={days}
            variant="outline"
            size="sm"
            onClick={() => setDraft({ kind: 'preset', days })}
            className={`rounded-full flex-1 border-border bg-foreground/5 hover:bg-foreground/10 ${
              draft.kind === 'preset' && draft.days === days
                ? 'border-cyan-500/40 bg-cyan-500/10 text-theme-cyan hover:bg-cyan-500/20'
                : 'text-foreground'
            }`}
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
