import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Check } from 'lucide-react';
import { type ColorToken, COLOR_OPTIONS, COLOR_CONFIG } from '../../data/settings';

type ColorPickerProps = {
  value: ColorToken;
  onChange: (value: ColorToken) => void;
  label?: string;
};

export function ColorPicker({ value, onChange, label = 'Color' }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const selectedConfig = COLOR_CONFIG[value] ?? COLOR_CONFIG.cyan;

  return (
    <div className="space-y-2">
      {label && <Label className="text-foreground">{label}</Label>}
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
            <span>{selectedConfig.label}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 bg-popover border-border shadow-xl">
          <div className="text-xs font-medium text-muted-foreground mb-2">Select a color</div>
          <div className="grid grid-cols-4 gap-2">
            {COLOR_OPTIONS.map(c => {
              const isSelected = c.id === value;
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
                  title={c.label}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: c.dotColor }}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-gray-950 font-bold" />}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-1 truncate max-w-full">{c.label}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
