'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from './utils';

export interface CheckboxProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, checked = false, onCheckedChange, disabled, onClick, ...props }, ref) => {
    return (
      <button
        type="button"
        role="checkbox"
        ref={ref}
        aria-checked={checked}
        disabled={disabled}
        data-state={checked ? 'checked' : 'unchecked'}
        onClick={e => {
          onClick?.(e);
          if (!e.defaultPrevented && !disabled) {
            onCheckedChange?.(!checked);
          }
        }}
        className={cn(
          'peer size-4 shrink-0 rounded-[4px] border border-border shadow-xs transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center cursor-pointer',
          checked
            ? 'bg-theme-cyan-btn border-cyan-400 text-gray-950 shadow-cyan-500/20'
            : 'bg-input-background dark:bg-input/30 hover:border-muted-foreground/60',
          className,
        )}
        {...props}
      >
        {checked && <Check className="size-3.5 stroke-[3] text-gray-950" />}
      </button>
    );
  },
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
