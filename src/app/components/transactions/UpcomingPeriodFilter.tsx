import { useEffect, useState } from 'react';
import { FilterChip } from './FilterChip';
import { FilterPanel } from './FilterPanel';
import { DateField } from './DateField';
import { Button } from '../ui/button';
import { formatFull } from '../../data/dates';

export type UpcomingPeriodType =
  { kind: 'preset'; days: number } | { kind: 'end-of-month' } | { kind: 'all' } | { kind: 'custom'; until: Date };

const UPCOMING_PRESETS = [7, 15, 30] as const;

type UpcomingPeriodFilterProps = {
  value: UpcomingPeriodType;
  onChange: (value: UpcomingPeriodType) => void;
};

export function UpcomingPeriodFilter({ value, onChange }: UpcomingPeriodFilterProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<UpcomingPeriodType>(value);

  useEffect(() => {
    if (open) {
      setDraft(value);
    }
  }, [open, value]);

  const active = value.kind !== 'all';
  let label = 'View all';
  if (value.kind === 'preset') {
    label = `Next ${value.days} days`;
  } else if (value.kind === 'end-of-month') {
    label = 'End of month';
  } else if (value.kind === 'custom') {
    if (value.until) {
      label = `Until ${formatFull(value.until)}`;
    } else {
      label = 'Custom date';
    }
  }

  const applyDisabled = draft.kind === 'custom' && !draft.until;

  return (
    <FilterPanel
      open={open}
      onOpenChange={setOpen}
      title="Upcoming Period"
      trigger={<FilterChip active={active} label={label} />}
      onApply={() => onChange(draft)}
      onClear={() => onChange({ kind: 'all' })}
      applyDisabled={applyDisabled}
    >
      <div className="flex gap-2 mb-6">
        {UPCOMING_PRESETS.map(days => (
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
            {days} Days
          </Button>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDraft({ kind: 'end-of-month' })}
          className={`rounded-full flex-1 border-border bg-foreground/5 hover:bg-foreground/10 ${
            draft.kind === 'end-of-month'
              ? 'border-cyan-500/40 bg-cyan-500/10 text-theme-cyan hover:bg-cyan-500/20'
              : 'text-foreground'
          }`}
        >
          End of month
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
          View all
        </Button>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-medium text-foreground">Custom date limit</div>
        <div className="space-y-2">
          <DateField
            placeholder="Until date"
            value={draft.kind === 'custom' ? draft.until : undefined}
            onChange={date =>
              setDraft({
                kind: 'custom',
                until: date,
              })
            }
          />
        </div>
      </div>
    </FilterPanel>
  );
}
