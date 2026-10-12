import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { ColorPicker } from '../settings/ColorPicker';
import { IconPicker } from '../settings/IconPicker';
import { CategoryChip } from '../shared/CategoryChip';
import { type GoalCategory } from '../../data/goals';
import { type ColorToken, type TransactionTypeConfig } from '../../data/settings';
import { type IconKey } from '../../data/icons';
import { Plus, Check, ArrowRightLeft } from 'lucide-react';

type GoalCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: GoalCategory | null;
  availableTypes: TransactionTypeConfig[];
  typeMappings: Record<string, string>;
  allCategories: GoalCategory[];
  onSave: (category: GoalCategory, mappedTypeIds: string[]) => void;
};

export function GoalCategoryDialog({
  open,
  onOpenChange,
  category,
  availableTypes,
  typeMappings,
  allCategories,
  onSave,
}: GoalCategoryDialogProps) {
  const [name, setName] = useState('');
  const [percentage, setPercentage] = useState<number | ''>(10);
  const [color, setColor] = useState<ColorToken>('blue');
  const [icon, setIcon] = useState<IconKey>('Target');
  const [description, setDescription] = useState('');
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (category) {
      setName(category.name);
      setPercentage(category.percentage);
      setColor(category.color);
      setIcon(category.icon);
      setDescription(category.description || '');

      // Load currently mapped types
      const initialTypeIds = availableTypes.filter(t => typeMappings[t.id] === category.id).map(t => t.id);
      setSelectedTypeIds(initialTypeIds);
    } else {
      setName('');
      setPercentage(10);
      setColor('cyan');
      setIcon('Target');
      setDescription('');
      setSelectedTypeIds([]);
    }
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category]);

  function handleToggleType(typeId: string) {
    setSelectedTypeIds(prev => (prev.includes(typeId) ? prev.filter(id => id !== typeId) : [...prev, typeId]));
  }

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

    onSave(
      {
        id: categoryId,
        name: name.trim(),
        percentage: numericPct,
        color,
        icon,
        description: description.trim() || undefined,
      },
      selectedTypeIds,
    );

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 gap-0 bg-popover border-border">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="text-xl text-foreground">
            {category ? 'Edit Financial Goal' : 'Add Financial Goal'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Customize the name, allocation percentage, styling, and contributing transaction types.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
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

          {/* Contributing Transaction Types */}
          <div className="space-y-2.5 pt-3 border-t border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground text-sm font-semibold">Contributing Transaction Types</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select which expense types count toward this goal.
                </p>
              </div>
              {availableTypes.length > 0 && (
                <span className="text-xs text-muted-foreground font-medium">
                  {selectedTypeIds.length} of {availableTypes.length}
                </span>
              )}
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 rounded-xl border border-border/60 bg-foreground/[0.02] p-2">
              {availableTypes.length === 0 ? (
                <div className="text-xs text-muted-foreground p-3 text-center">
                  No expense transaction types configured.
                </div>
              ) : (
                availableTypes.map(t => {
                  const isSelected = selectedTypeIds.includes(t.id);
                  const currentMappedCatId = typeMappings[t.id];
                  const isMappedToOther = currentMappedCatId && (!category || currentMappedCatId !== category.id);
                  const otherCat = isMappedToOther ? allCategories.find(c => c.id === currentMappedCatId) : null;

                  return (
                    <div
                      key={t.id}
                      onClick={() => handleToggleType(t.id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border text-xs select-none ${
                        isSelected
                          ? 'bg-cyan-500/10 border-cyan-400/40 text-foreground'
                          : 'bg-foreground/[0.02] border-transparent hover:bg-foreground/5 text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Checkbox checked={isSelected} className="pointer-events-none" />
                        <CategoryChip typeConfig={t} size="sm" />
                      </div>

                      {otherCat && !isSelected && (
                        <span
                          className="text-[11px] text-muted-foreground truncate max-w-[130px]"
                          title={`Mapped to ${otherCat.name}`}
                        >
                          Mapped to {otherCat.name}
                        </span>
                      )}
                      {isSelected && isMappedToOther && (
                        <span
                          className="text-[11px] text-amber-500 font-medium truncate max-w-[140px] flex items-center gap-1"
                          title={`Will be reassigned from ${otherCat?.name}`}
                        >
                          <ArrowRightLeft className="w-3 h-3 flex-shrink-0" />
                          <span>Reassign from {otherCat?.name}</span>
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}

          <DialogFooter className="pt-4 border-t border-border sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-theme-cyan-btn hover:bg-theme-cyan-btn-hover text-white dark:text-gray-950 font-semibold shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
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
