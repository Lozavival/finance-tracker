import * as React from 'react';
import { cn } from '@/lib/utils';

export type ProgressBarProps = {
  value: number; // 0 to 100
  color?: string; // CSS color string or custom class
  heightClassName?: string;
  className?: string;
};

export function ProgressBar({ value, color, heightClassName = 'h-2', className }: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('w-full bg-foreground/10 rounded-full overflow-hidden', heightClassName, className)}>
      <div
        className={cn('h-full transition-all duration-500 rounded-full', !color && 'bg-theme-cyan')}
        style={{
          width: `${clampedValue}%`,
          ...(color ? { backgroundColor: color } : {}),
        }}
      />
    </div>
  );
}
