import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';
import { type ColorToken, COLOR_OPTIONS, COLOR_CONFIG } from '@/data/settings';
import { useI18n } from '@/i18n';

type ColorPickerProps = {
  value: ColorToken;
  onChange: (value: ColorToken) => void;
  label?: string;
};

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const { t } = useI18n();
  const displayLabel = label ?? t('common.color');
  const [open, setOpen] = useState(false);
  const selectedConfig = COLOR_CONFIG[value] ?? COLOR_CONFIG.cyan;
  const getColorLabel = (id: ColorToken, fallback: string) => {
    return t(`defaults.colors.${id}` as any) || fallback;
  };

  return (
    <div className="space-y-2">
      {displayLabel && <Label className="text-foreground">{displayLabel}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2.5 h-11 border-border bg-foreground/5 text-foreground hover:bg-foreground/10"
          >
            <span
              className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
              style={{ backgroundColor: selectedConfig.dotColor }}
            />
            <span>{getColorLabel(selectedConfig.id, selectedConfig.label)}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 bg-popover border-border shadow-xl">
          <div className="text-xs font-medium text-muted-foreground mb-2">{t('common.selectColor')}</div>
          <div className="grid grid-cols-4 gap-2">
            {COLOR_OPTIONS.map(c => {
              const isSelected = c.id === value;
              const colorLabel = getColorLabel(c.id, c.label);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                  className={`group relative flex flex-col items-center justify-center p-2 rounded-lg border transition-all hover:scale-105 ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-500/10 shadow-md shadow-cyan-500/20'
                      : 'border-border/50 hover:border-border hover:bg-foreground/5'
                  }`}
                  title={colorLabel}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: c.dotColor }}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-gray-950 font-bold" />}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-1 truncate max-w-full">{colorLabel}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
