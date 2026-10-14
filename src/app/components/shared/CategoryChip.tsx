import { type TransactionTypeConfig, COLOR_CONFIG } from '@/data/settings';
import { getIcon } from '@/data/icons';

type CategoryChipProps = {
  typeConfig?: TransactionTypeConfig;
  label?: string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
};

function formatTypeFallback(str?: string): string {
  if (!str) return 'Unknown';
  return str.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function CategoryChip({ typeConfig, label, size = 'sm', showIcon = true, className = '' }: CategoryChipProps) {
  const displayText = typeConfig?.name ?? (label ? formatTypeFallback(label) : 'Unknown');

  if (!typeConfig) {
    return <span className={`inline-flex items-center text-muted-foreground ${className}`}>{displayText}</span>;
  }

  const colorMeta = COLOR_CONFIG[typeConfig.color] ?? COLOR_CONFIG.slate;
  const Icon = getIcon(typeConfig.icon);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium transition-colors ${
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      } ${className}`}
      style={{
        backgroundColor: colorMeta.badgeBg,
        borderColor: colorMeta.badgeBorder,
        borderWidth: 1,
        borderStyle: 'solid',
        color: colorMeta.textColor,
      }}
    >
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />}
      <span>{displayText}</span>
    </span>
  );
}
