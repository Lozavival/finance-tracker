import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar, RotateCcw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { Button } from '@/components/primitives/button';
import { addMonthsClamped, formatMonthYear, getToday } from '@/data/dates';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

export type MonthPickerProps = {
  value: Date;
  onChange: (month: Date) => void;
  onPrev?: () => void;
  onNext?: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  isMonthEnabled?: (year: number, monthIndex: number) => boolean;
  className?: string;
};

export function MonthPicker({
  value,
  onChange,
  onPrev,
  onNext,
  prevDisabled = false,
  nextDisabled = false,
  isMonthEnabled,
  className,
}: MonthPickerProps) {
  const { t, locale } = useI18n();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(() => value.getFullYear());

  const handleOpenChange = (open: boolean) => {
    setPopoverOpen(open);
    if (open) {
      setPickerYear(value.getFullYear());
    }
  };

  const handlePrev = () => {
    if (onPrev) {
      onPrev();
    } else {
      onChange(addMonthsClamped(value, -1));
    }
  };

  const handleNext = () => {
    if (onNext) {
      onNext();
    } else {
      onChange(addMonthsClamped(value, 1));
    }
  };

  const today = getToday();
  const isCurrentMonth = value.getFullYear() === today.getFullYear() && value.getMonth() === today.getMonth();
  const currentMonthEnabled = isMonthEnabled ? isMonthEnabled(today.getFullYear(), today.getMonth()) : true;

  const handleCurrentMonth = () => {
    onChange(new Date(today.getFullYear(), today.getMonth(), 1));
    setPickerYear(today.getFullYear());
    setPopoverOpen(false);
  };

  const formattedMonthYear = formatMonthYear(value, locale);
  const displayMonthYear = formattedMonthYear.charAt(0).toUpperCase() + formattedMonthYear.slice(1);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {!isCurrentMonth && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleCurrentMonth}
          disabled={!currentMonthEnabled}
          className="h-9 px-3 gap-1.5 text-xs font-medium rounded-lg border-border hover:border-cyan-500/40 bg-transparent text-muted-foreground hover:text-theme-cyan transition-colors"
          aria-label={t('common.backToCurrentMonth')}
          title={t('common.backToCurrentMonth')}
        >
          <RotateCcw className="w-3.5 h-3.5 text-theme-cyan" />
          <span>{t('common.backToCurrentMonth')}</span>
        </Button>
      )}

      <div className="flex items-center rounded-lg border border-border bg-foreground/5 p-0.5 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrev}
          disabled={prevDisabled}
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-foreground/10 disabled:opacity-30 disabled:pointer-events-none"
          aria-label={t('common.previousMonth')}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <Popover open={popoverOpen} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 px-3 gap-2 text-sm font-medium text-foreground hover:bg-foreground/10 hover:text-theme-cyan transition-colors"
            >
              <Calendar className="w-4 h-4 text-theme-cyan" />
              <span>{displayMonthYear}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(280px,calc(100vw-1rem))] bg-popover/95 backdrop-blur-xl border-border p-4 shadow-xl rounded-2xl z-50">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setPickerYear(y => y - 1)}
                aria-label={t('common.previousYear')}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-semibold text-foreground text-sm">{pickerYear}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setPickerYear(y => y + 1)}
                aria-label={t('common.nextYear')}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 12 }, (_, i) => i).map(monthIndex => {
                const isCurrent = value.getFullYear() === pickerYear && value.getMonth() === monthIndex;
                const isEnabled = isMonthEnabled ? isMonthEnabled(pickerYear, monthIndex) : true;
                const monthName = new Date(pickerYear, monthIndex, 1).toLocaleString(locale, {
                  month: 'short',
                });

                return (
                  <Button
                    key={monthIndex}
                    variant={isCurrent ? 'default' : 'outline'}
                    size="sm"
                    disabled={!isEnabled}
                    className={cn(
                      'text-xs h-9 font-medium transition-all',
                      isCurrent &&
                        'bg-theme-cyan-btn text-white dark:text-gray-950 font-semibold shadow-md shadow-cyan-500/20',
                      !isCurrent &&
                        isEnabled &&
                        'border-border bg-foreground/5 text-foreground hover:border-cyan-400/40 hover:text-theme-cyan hover:bg-foreground/10',
                      !isEnabled && 'opacity-30 border-border bg-foreground/5 text-muted-foreground',
                    )}
                    onClick={() => {
                      onChange(new Date(pickerYear, monthIndex, 1));
                      setPopoverOpen(false);
                    }}
                  >
                    {monthName}
                  </Button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          disabled={nextDisabled}
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-foreground/10 disabled:opacity-30 disabled:pointer-events-none"
          aria-label={t('common.nextMonth')}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
