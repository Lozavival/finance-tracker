import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/primitives/input';
import { Button } from '@/components/primitives/button';
import { useI18n } from '@/i18n';

export interface SearchFilterProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SearchFilter({ value, onChange, className }: SearchFilterProps) {
  const { t } = useI18n();

  return (
    <div className={`relative flex items-center min-w-[220px] max-w-[320px] ${className ?? ''}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-cyan pointer-events-none" />
      <Input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={t('transactions.searchPlaceholder')}
        className="h-9 pl-9 pr-8 bg-foreground/5 border-border hover:border-border/80 focus:border-theme-cyan rounded-lg text-sm text-foreground placeholder:text-muted-foreground transition-colors"
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange('')}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
          title={t('search.clear')}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}
