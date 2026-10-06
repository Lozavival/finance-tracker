import { useEffect, useState } from "react";
import { FilterChip } from "./FilterChip";
import { FilterPanel } from "./FilterPanel";
import { EXPENSE_TYPES, INCOME_TYPES, TransactionType } from "../../data/transactions";
import { Toggle } from "../ui/toggle";

type TypeFilterProps = {
  value: TransactionType[];
  onChange: (value: TransactionType[]) => void;
};

export function TypeFilter({ value, onChange }: TypeFilterProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TransactionType[]>(value);

  useEffect(() => {
    if (open) {
      setDraft(value);
    }
  }, [open, value]);

  const active = value.length > 0;
  let label = "Type";
  if (value.length === 1) {
    label = value[0];
  } else if (value.length > 1) {
    label = `${value[0]} +${value.length - 1}`;
  }

  const renderToggle = (type: TransactionType) => {
    const isSelected = draft.includes(type);
    return (
      <Toggle
        key={type}
        pressed={isSelected}
        onPressedChange={(pressed) => {
          if (pressed) {
            setDraft([...draft, type]);
          } else {
            setDraft(draft.filter((t) => t !== type));
          }
        }}
        variant="outline"
        className="rounded-full border-border bg-foreground/5 hover:bg-foreground/10 data-[state=on]:border-cyan-500/40 data-[state=on]:bg-cyan-500/10 data-[state=on]:text-theme-cyan data-[state=on]:hover:bg-cyan-500/20"
      >
        {type}
      </Toggle>
    );
  };

  return (
    <FilterPanel
      open={open}
      onOpenChange={setOpen}
      title="Transaction type"
      trigger={<FilterChip active={active} label={label} />}
      onApply={() => onChange(draft)}
      onClear={() => onChange([])}
    >
      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Income
          </div>
          <div className="flex flex-wrap gap-2">
            {INCOME_TYPES.map(renderToggle)}
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Expense
          </div>
          <div className="flex flex-wrap gap-2">
            {EXPENSE_TYPES.map(renderToggle)}
          </div>
        </div>
      </div>
    </FilterPanel>
  );
}

