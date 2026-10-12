import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '../ui/utils';
import { formatFull } from '../../data/dates';
import { useI18n } from '../../i18n';

type DateFieldProps = {
  placeholder: string;
  value: Date | undefined;
  onChange: (date: Date) => void;
  disabledDays?: (date: Date) => boolean;
  className?: string;
  hasError?: boolean;
};

export function DateField({ placeholder, value, onChange, disabledDays, className, hasError }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const { locale } = useI18n();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-invalid={hasError}
          className={cn(
            'w-full justify-between border-border bg-foreground/5 text-left font-normal text-foreground hover:bg-foreground/10',
            !value && 'text-muted-foreground',
            hasError && 'border-red-500/50',
            className,
          )}
        >
          {value ? formatFull(value, locale) : placeholder}
          <CalendarIcon className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-border bg-popover text-foreground" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={d => {
            if (d) {
              onChange(d);
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
