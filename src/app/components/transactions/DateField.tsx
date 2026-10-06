import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../ui/utils";
import { formatTransactionDate, parseTransactionDate, toTransactionDate } from "../../data/transactions";

type DateFieldProps = {
  placeholder: string;
  value: string | undefined;
  onChange: (date: string) => void;
  disabledDays?: (date: Date) => boolean;
};

export function DateField({ placeholder, value, onChange, disabledDays }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const dateValue = value ? parseTransactionDate(value) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-between border-border bg-foreground/5 text-left font-normal text-foreground hover:bg-foreground/10",
            !value && "text-muted-foreground"
          )}
        >
          {value ? formatTransactionDate(value) : placeholder}
          <CalendarIcon className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-border bg-popover text-foreground" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={(d) => {
            if (d) {
              onChange(toTransactionDate(d));
              setOpen(false);
            }
          }}
          disabled={disabledDays}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

