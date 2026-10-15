import * as React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type InlineAlertVariant = 'warning' | 'info' | 'destructive' | 'success';

export type InlineAlertProps = {
  variant?: InlineAlertVariant;
  icon?: LucideIcon | false;
  children: React.ReactNode;
  className?: string;
};

const variantStyles: Record<
  InlineAlertVariant,
  {
    container: string;
    iconColor: string;
    defaultIcon: LucideIcon;
  }
> = {
  warning: {
    container: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    iconColor: 'text-amber-600 dark:text-amber-400',
    defaultIcon: AlertCircle,
  },
  info: {
    container: 'border-cyan-500/30 bg-cyan-500/10 text-theme-cyan',
    iconColor: 'text-cyan-400',
    defaultIcon: Info,
  },
  destructive: {
    container: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    iconColor: 'text-rose-600 dark:text-rose-400',
    defaultIcon: AlertTriangle,
  },
  success: {
    container: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    defaultIcon: CheckCircle2,
  },
};

export function InlineAlert({ variant = 'warning', icon, children, className }: InlineAlertProps) {
  const current = variantStyles[variant];
  const IconComponent = icon === false ? null : (icon ?? current.defaultIcon);

  return (
    <div className={cn('flex items-start gap-2.5 rounded-lg border p-3 text-xs', current.container, className)}>
      {IconComponent && <IconComponent className={cn('w-4 h-4 flex-shrink-0 mt-0.5', current.iconColor)} />}
      <div className="flex-1 leading-relaxed">{children}</div>
    </div>
  );
}
