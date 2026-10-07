import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { Label } from '../ui/label';

export type DialogMode = 'income' | 'expense' | 'transfer';

type DirectionToggleProps = {
  value: DialogMode;
  onChange: (value: DialogMode) => void;
};

export function DirectionToggle({ value, onChange }: DirectionToggleProps) {
  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground">Transaction direction</Label>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={nextValue => {
          if (nextValue) onChange(nextValue as DialogMode);
        }}
        aria-label="Transaction direction"
        className="w-full rounded-xl border border-border bg-muted/40 p-1"
      >
        <ToggleGroupItem
          value="income"
          aria-label="Income"
          className="h-11 rounded-lg text-muted-foreground transition-all data-[state=on]:bg-background data-[state=on]:text-emerald-400 data-[state=on]:shadow-sm"
        >
          <ArrowDownLeft className="mr-2 h-4 w-4" />
          Income
        </ToggleGroupItem>
        <ToggleGroupItem
          value="expense"
          aria-label="Expense"
          className="h-11 rounded-lg text-muted-foreground transition-all data-[state=on]:bg-background data-[state=on]:text-red-400 data-[state=on]:shadow-sm"
        >
          <ArrowUpRight className="mr-2 h-4 w-4" />
          Expense
        </ToggleGroupItem>
        <ToggleGroupItem
          value="transfer"
          aria-label="Transfer"
          className="h-11 rounded-lg text-muted-foreground transition-all data-[state=on]:bg-background data-[state=on]:text-indigo-400 data-[state=on]:shadow-sm"
        >
          <ArrowLeftRight className="mr-2 h-4 w-4" />
          Transfer
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
