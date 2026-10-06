import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";

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
            Apply filter
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              onClear();
              onOpenChange(false);
            }}
            className="w-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
          >
            Clear filter
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

