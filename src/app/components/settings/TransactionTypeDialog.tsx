import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { ColorPicker } from './ColorPicker';
import { IconPicker } from './IconPicker';
import { CategoryChip } from '../shared/CategoryChip';
import { type TransactionTypeConfig, type Direction, type ColorToken } from '../../data/settings';
import { type IconKey } from '../../data/icons';
import { type Transaction } from '../../data/transactions';
import { useSettings } from '../../state/SettingsContext';
import { AlertCircle } from 'lucide-react';

type TransactionTypeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  typeConfig?: TransactionTypeConfig | null;
  defaultDirection?: Direction;
  transactions: Transaction[];
  onSave: (saved: TransactionTypeConfig) => void;
};

export function TransactionTypeDialog({
  open,
  onOpenChange,
  typeConfig,
  defaultDirection = 'expense',
  transactions,
  onSave,
}: TransactionTypeDialogProps) {
  const isEditing = Boolean(typeConfig);
  const { settings } = useSettings();

  const [name, setName] = useState('');
  const [direction, setDirection] = useState<Direction>(defaultDirection);
  const [color, setColor] = useState<ColorToken>('cyan');
  const [icon, setIcon] = useState<IconKey>('Tag');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isSystem = Boolean(typeConfig?.system);

  // Check how many transactions use this type
  const usageCount = useMemo(() => {
    if (!typeConfig) return 0;
    return transactions.filter(t => t.typeId === typeConfig.id).length;
  }, [typeConfig, transactions]);

  // Block changing direction if in use or system
  const directionLocked = isSystem || (isEditing && usageCount > 0);

  useEffect(() => {
    if (!open) return;
    setErrors({});

    if (typeConfig) {
      setName(typeConfig.name);
      setDirection(typeConfig.direction);
      setColor(typeConfig.color);
      setIcon(typeConfig.icon);
    } else {
      setName('');
      setDirection(defaultDirection);
      setColor(defaultDirection === 'income' ? 'emerald' : 'cyan');
      setIcon(defaultDirection === 'income' ? 'Banknote' : 'ShoppingBag');
    }
  }, [open, typeConfig, defaultDirection]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};

    const trimmedName = name.trim();
    if (!trimmedName) {
      nextErrors.name = 'Please enter a name for the type.';
    } else {
      // Check for duplicate name in the same direction
      const duplicate = settings.transactionTypes.some(
        t => t.direction === direction && t.name.toLowerCase() === trimmedName.toLowerCase() && t.id !== typeConfig?.id,
      );
      if (duplicate) {
        nextErrors.name = `A ${direction} type named "${trimmedName}" already exists.`;
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    let id = typeConfig?.id;
    if (!id) {
      id = trimmedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      if (!id || settings.transactionTypes.some(t => t.id === id)) {
        id = `type-${Date.now()}`;
      }
    }

    const result: TransactionTypeConfig = {
      id,
      name: trimmedName,
      direction,
      color,
      icon,
      system: typeConfig?.system,
    };

    onSave(result);
    onOpenChange(false);
  }

  const previewConfig: TransactionTypeConfig = {
    id: typeConfig?.id || 'preview',
    name: name.trim() || 'Type Name',
    direction,
    color,
    icon,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-border bg-popover p-0 text-foreground shadow-2xl sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-border p-6 pr-14">
            <DialogTitle>{isEditing ? 'Edit transaction type' : 'Add transaction type'}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {isEditing
                ? 'Update how this category is named, styled, and displayed.'
                : 'Create a custom category for your income or expenses.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 p-6">
            <div className="space-y-2">
              <Label className="text-foreground">Type Name</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Healthcare, Freelance"
                aria-invalid={Boolean(errors.name)}
                className="h-11 border-border bg-foreground/5 text-foreground placeholder:text-muted-foreground"
              />
              {errors.name && <div className="text-xs text-red-400">{errors.name}</div>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-foreground">Direction</Label>
                {directionLocked && (
                  <span className="text-xs text-muted-foreground">
                    {isSystem ? 'System type' : `Locked (${usageCount} transactions)`}
                  </span>
                )}
              </div>
              <ToggleGroup
                type="single"
                value={direction}
                disabled={directionLocked}
                onValueChange={val => val && setDirection(val as Direction)}
                className="w-full justify-start bg-foreground/5 p-1 rounded-lg border border-border disabled:opacity-50"
              >
                <ToggleGroupItem
                  value="income"
                  className="flex-1 data-[state=on]:bg-emerald-500/20 data-[state=on]:text-emerald-400"
                >
                  Income
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="expense"
                  className="flex-1 data-[state=on]:bg-cyan-500/20 data-[state=on]:text-theme-cyan"
                >
                  Expense
                </ToggleGroupItem>
              </ToggleGroup>

              {isEditing && usageCount > 0 && !isSystem && (
                <div className="flex items-start gap-2 rounded-lg bg-foreground/5 border border-border p-2.5 text-xs text-muted-foreground">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-cyan-400" />
                  <span>To change direction, reassign its {usageCount} existing transaction(s) first.</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ColorPicker value={color} onChange={setColor} label="Badge Color" />
              <IconPicker value={icon} onChange={setIcon} label="Icon" />
            </div>

            <div className="pt-3 border-t border-border/60">
              <div className="text-xs text-muted-foreground mb-2">Live Preview</div>
              <div className="p-3 rounded-lg border border-border/60 bg-foreground/5 flex items-center justify-center">
                <CategoryChip typeConfig={previewConfig} size="md" />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border p-6 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-theme-cyan-btn text-white dark:text-gray-950 hover:bg-theme-cyan-btn-hover shadow-lg shadow-cyan-500/20"
            >
              {isEditing ? 'Save changes' : 'Add type'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
