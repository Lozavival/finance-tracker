import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { Button } from '@/components/primitives/button';
import { useI18n } from '@/i18n';

type FilterPanelProps = {
  trigger: React.ReactNode;
  title: string;
  children: React.ReactNode;
  onApply: () => void;
  onClear: () => void;
  applyDisabled?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FilterPanel({
  trigger,
  title,
  children,
  onApply,
  onClear,
  applyDisabled,
  open,
  onOpenChange,
}: FilterPanelProps) {
  const { t } = useI18n();

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-80 border-border bg-popover text-foreground p-0">
        <div className="p-4">
          <div role="heading" aria-level={3} className="mb-4 text-sm font-medium leading-none text-foreground">
            {title}
          </div>
          {children}
        </div>
        <div className="border-t border-border p-4 flex flex-col gap-2">
          <Button
            onClick={() => {
              onApply();
              onOpenChange(false);
            }}
            disabled={applyDisabled}
            className="w-full bg-theme-cyan-btn text-white dark:text-gray-950 hover:bg-theme-cyan-btn-hover shadow-lg shadow-cyan-500/20"
          >
            {t('common.applyFilter')}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              onClear();
              onOpenChange(false);
            }}
            className="w-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
          >
            {t('common.clearFilter')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
