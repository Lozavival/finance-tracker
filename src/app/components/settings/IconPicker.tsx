import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ICONS, type IconKey, getIcon } from '../../data/icons';
import { Search } from 'lucide-react';

type IconPickerProps = {
  value: IconKey;
  onChange: (key: IconKey) => void;
  label?: string;
};

const ALL_ICONS = Object.keys(ICONS) as IconKey[];

export function IconPicker({ value, onChange, label = 'Icon' }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const CurrentIcon = getIcon(value);

  const filteredIcons = ALL_ICONS.filter(k => k.toLowerCase().includes(search.trim().toLowerCase()));

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
            <CurrentIcon className="w-4 h-4 text-theme-cyan" />
            <span>{value}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3 bg-popover border-border shadow-xl">
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search icons..."
              className="h-9 pl-8 text-xs border-border bg-foreground/5 text-foreground"
            />
          </div>

          <div className="grid grid-cols-5 gap-1.5 max-h-48 overflow-y-auto pr-1">
            {filteredIcons.map(key => {
              const Icon = getIcon(key);
              const isSelected = key === value;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                  className={`p-2 rounded-md flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-cyan-500/20 text-theme-cyan border border-cyan-500/40 shadow-sm'
                      : 'hover:bg-foreground/10 text-muted-foreground hover:text-foreground'
                  }`}
                  title={key}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
            {filteredIcons.length === 0 && (
              <div className="col-span-5 text-center py-4 text-xs text-muted-foreground">No icons found.</div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
