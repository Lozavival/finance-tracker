import { useState, useEffect, useMemo, type FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/primitives/dialog';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { Label } from '@/components/primitives/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/primitives/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { ColorPicker } from '@/components/shared/ColorPicker';
import { IconPicker } from '@/components/shared/IconPicker';
import { CategoryChip } from '@/components/shared/CategoryChip';
import { type TransactionTypeConfig, type Direction, type ColorToken, COLOR_CONFIG } from '@/data/settings';
import { type IconKey, getIcon } from '@/data/icons';
import { type Transaction } from '@/data/transactions';
import { useSettings } from '@/state/SettingsContext';
import { AlertCircle, Target } from 'lucide-react';
import { useI18n } from '@/i18n';

type TransactionTypeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  typeConfig?: TransactionTypeConfig | null;
  defaultDirection?: Direction;
  transactions: Transaction[];
  onSave: (saved: TransactionTypeConfig, linkedGoalId?: string) => void;
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
  const { t } = useI18n();

  const [name, setName] = useState('');
  const [direction, setDirection] = useState<Direction>(defaultDirection);
  const [color, setColor] = useState<ColorToken>('cyan');
  const [icon, setIcon] = useState<IconKey>('Tag');
  const [linkedGoalId, setLinkedGoalId] = useState<string>('');
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
      setLinkedGoalId(settings.goals?.typeMappings?.[typeConfig.id] || '');
    } else {
      setName('');
      setDirection(defaultDirection);
      setColor(defaultDirection === 'income' ? 'emerald' : 'cyan');
      setIcon(defaultDirection === 'income' ? 'Banknote' : 'ShoppingBag');
      setLinkedGoalId('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, typeConfig, defaultDirection]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};

    const trimmedName = name.trim();
    if (!trimmedName) {
      nextErrors.name = t('settings.types.errors.enterName');
    } else {
      // Check for duplicate name in the same direction
      const duplicate = settings.transactionTypes.some(
        t => t.id !== typeConfig?.id && t.direction === direction && t.name.toLowerCase() === trimmedName.toLowerCase(),
      );
      if (duplicate) {
        nextErrors.name = t('settings.types.errors.duplicateName', {
          direction: t(direction === 'income' ? 'common.income' : 'common.expense').toLowerCase(),
          name: trimmedName,
        });
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

    onSave(result, direction === 'expense' && linkedGoalId ? linkedGoalId : undefined);
    onOpenChange(false);
  }

  const previewConfig: TransactionTypeConfig = {
    id: typeConfig?.id || 'preview',
    name: name.trim() || t('settings.types.typeName'),
    direction,
    color,
    icon,
  };

  const goalCategories = settings.goals?.categories || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-border bg-popover p-0 text-foreground shadow-2xl sm:max-w-md max-h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <DialogHeader className="border-b border-border p-6 pr-14 flex-shrink-0">
            <DialogTitle>{isEditing ? t('settings.types.editTitle') : t('settings.types.addTitle')}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {isEditing ? t('settings.types.editDesc') : t('settings.types.addDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-6 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label htmlFor="type-name" className="text-foreground">
                {t('settings.types.typeName')}
              </Label>
              <Input
                id="type-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('settings.types.namePlaceholder')}
                aria-invalid={Boolean(errors.name)}
                className="h-11 border-border bg-foreground/5 text-foreground placeholder:text-muted-foreground"
              />
              {errors.name && <div className="text-xs text-destructive">{errors.name}</div>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-foreground">{t('common.direction')}</Label>
                {directionLocked && (
                  <span className="text-xs text-muted-foreground">
                    {isSystem ? t('settings.types.systemType') : t('settings.types.lockedUsage', { count: usageCount })}
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
                  {t('common.income')}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="expense"
                  className="flex-1 data-[state=on]:bg-cyan-500/20 data-[state=on]:text-theme-cyan"
                >
                  {t('common.expense')}
                </ToggleGroupItem>
              </ToggleGroup>

              {isEditing && usageCount > 0 && !isSystem && (
                <div className="flex items-start gap-2 rounded-lg bg-foreground/5 border border-border p-2.5 text-xs text-muted-foreground">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-cyan-400" />
                  <span>{t('settings.types.changeDirectionWarning', { count: usageCount })}</span>
                </div>
              )}
            </div>

            {/* Linked Goal Category (Prompted for Expense Types) */}
            {direction === 'expense' && (
              <div className="space-y-2 pt-1 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-theme-cyan" />
                    <Label className="text-foreground text-sm font-semibold">{t('settings.types.linkedGoal')}</Label>
                  </div>
                  {linkedGoalId && (
                    <span className="text-[11px] text-theme-cyan font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/20">
                      {t('settings.types.linkedBadge')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{t('settings.types.linkedGoalHint')}</p>

                <Select
                  value={linkedGoalId || 'none'}
                  onValueChange={val => setLinkedGoalId(val === 'none' ? '' : val)}
                >
                  <SelectTrigger className="h-11 border-border bg-foreground/5 text-foreground">
                    <SelectValue placeholder={t('settings.types.selectGoalPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    <SelectItem value="none">
                      <span className="text-muted-foreground">{t('settings.types.noneUnassigned')}</span>
                    </SelectItem>
                    {goalCategories.map(cat => {
                      const c = COLOR_CONFIG[cat.color];
                      const CatIcon = getIcon(cat.icon);
                      return (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: c?.dotColor || '#3b82f6' }}
                            />
                            <CatIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium">{cat.name}</span>
                            <span className="text-xs text-muted-foreground">({cat.percentage}%)</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <ColorPicker value={color} onChange={setColor} label={t('settings.types.badgeColor')} />
              <IconPicker value={icon} onChange={setIcon} label={t('common.icon')} />
            </div>

            <div className="pt-2 border-t border-border/60">
              <div className="text-xs text-muted-foreground mb-2">{t('common.livePreview')}</div>
              <div className="p-3 rounded-lg border border-border/60 bg-foreground/5 flex items-center justify-center">
                <CategoryChip typeConfig={previewConfig} size="md" />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border p-6 sm:justify-between flex-shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="cyan" className="cursor-pointer">
              {isEditing ? t('common.saveChanges') : t('settings.types.addType')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
