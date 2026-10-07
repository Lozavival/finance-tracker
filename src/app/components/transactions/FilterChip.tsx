import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';

type FilterChipProps = React.ComponentPropsWithoutRef<typeof Button> & {
  active?: boolean;
  label: React.ReactNode;
};

export const FilterChip = forwardRef<HTMLButtonElement, FilterChipProps>(
  ({ active, label, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant="outline"
        className={cn(
          'rounded-full border-border bg-foreground/5 text-foreground hover:bg-foreground/10 group data-[state=open]:bg-foreground/10',
          active &&
            'border-cyan-500/40 bg-cyan-500/10 text-theme-cyan hover:bg-cyan-500/20 data-[state=open]:bg-cyan-500/20',
          className,
        )}
        {...props}
      >
        {label}
        <ChevronDown className="ml-1 h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </Button>
    );
  },
);
FilterChip.displayName = 'FilterChip';
