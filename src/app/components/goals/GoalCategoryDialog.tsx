import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ColorPicker } from '../settings/ColorPicker';
import { IconPicker } from '../settings/IconPicker';
import { type GoalCategory } from '../../data/goals';
import { type ColorToken } from '../../data/settings';
import { type IconKey } from '../../data/icons';
import { Plus, Check } from 'lucide-react';

type GoalCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: GoalCategory | null;
  onSave: (category: GoalCategory) => void;
};

export function GoalCategoryDialog({ open, onOpenChange, category, onSave }: GoalCategoryDialogProps) {
  const [name, setName] = useState('');
  const [percentage, setPercentage] = useState<number | ''>(10);
  const [color, setColor] = useState<ColorToken>('blue');
  const [icon, setIcon] = useState<IconKey>('Target');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (category) {
      setName(category.name);
      setPercentage(category.percentage);
      setColor(category.color);
      setIcon(category.icon);
      setDescription(category.description || '');
    } else {
      setName('');
      setPercentage(10);
      setColor('cyan');
      setIcon('Target');
      setDescription('');
    }
    setError(null);
  }, [open, category]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a category name.');
      return;
    }

    const numericPct = typeof percentage === 'number' ? percentage : parseFloat(String(percentage)) || 0;
    if (numericPct < 0 || numericPct > 100) {
      setError('Percentage must be between 0% and 100%.');
      return;
    }

    const categoryId = category ? category.id : `cat-${Date.now()}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    onSave({
      id: categoryId,
      name: name.trim(),
      percentage: numericPct,
      color,
      icon,
      description: description.trim() || undefined,
    });

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-popover border-border">
        <DialogHeader>
          <DialogTitle className="text-xl text-foreground">
            {category ? 'Edit Financial Goal' : 'Add Financial Goal'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Customize the name, allocation percentage, color, and icon for this goal category.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="category-name" className="text-foreground">
              Category Name
            </Label>
            <Input
              id="category-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Investments, Charity, Travel..."
              className="h-11 border-border bg-foreground/5 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-percentage" className="text-foreground">
              Allocation Percentage (%)
            </Label>
            <div className="relative">
              <Input
                id="category-percentage"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={percentage}
                onChange={e => setPercentage(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="10"
                className="h-11 border-border bg-foreground/5 text-foreground pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                %
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ColorPicker value={color} onChange={setColor} label="Color Theme" />
            <IconPicker value={icon} onChange={setIcon} label="Category Icon" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-desc" className="text-foreground">
              Description (optional)
            </Label>
            <Input
              id="category-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of this bucket..."
              className="h-11 border-border bg-foreground/5 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}

          <DialogFooter className="pt-4 border-t border-border sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-theme-cyan-btn hover:bg-theme-cyan-btn-hover text-white dark:text-gray-950 font-semibold shadow-lg shadow-cyan-500/20 transition-all"
            >
              {category ? <Check className="w-4 h-4 mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
              {category ? 'Save Changes' : 'Add Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
