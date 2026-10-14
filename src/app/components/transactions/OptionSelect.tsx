import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type OptionEntry<T extends string = string> =
  | T
  | {
      value: T;
      label: string;
      icon?: React.ReactNode;
      customContent?: React.ReactNode;
    };

type OptionSelectProps<T extends string> = {
  label: string;
  value: T;
  options: readonly OptionEntry<T>[];
  onChange: (value: T) => void;
  error?: string;
  disabled?: boolean;
};

export function OptionSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  error,
  disabled,
}: OptionSelectProps<T>) {
  return (
    <div className="space-y-2">
      <Label className="text-foreground">{label}</Label>
      <Select value={value} onValueChange={next => onChange(next as T)} disabled={disabled}>
        <SelectTrigger
          aria-invalid={Boolean(error)}
          className="!h-11 border-border bg-foreground/5 text-foreground disabled:opacity-50"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-border bg-popover text-foreground">
          {options.map(option => {
            const isObj = typeof option === 'object' && option !== null;
            const optVal = isObj ? option.value : option;
            const optLabel = isObj ? option.label : option;
            const optIcon = isObj ? option.icon : null;
            const customContent = isObj ? option.customContent : null;

            return (
              <SelectItem key={optVal} value={optVal} textValue={optLabel}>
                {customContent ? (
                  customContent
                ) : (
                  <div className="flex items-center gap-2">
                    {optIcon}
                    <span>{optLabel}</span>
                  </div>
                )}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {error && <div className="text-red-400 text-sm">{error}</div>}
    </div>
  );
}
