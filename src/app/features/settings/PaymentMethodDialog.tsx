import { useState, useEffect, type FormEvent } from 'react';
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
import { IconPicker } from '@/components/shared/IconPicker';
import { getIcon, type IconKey } from '@/data/icons';
import { type PaymentMethodConfig } from '@/data/settings';
import { useSettings } from '@/state/SettingsContext';
import { useI18n } from '@/i18n';

type PaymentMethodDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  method?: PaymentMethodConfig | null;
  onSave: (saved: PaymentMethodConfig) => void;
};

export function PaymentMethodDialog({ open, onOpenChange, method, onSave }: PaymentMethodDialogProps) {
  const isEditing = Boolean(method);
  const { settings } = useSettings();
  const { t } = useI18n();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState<IconKey>('CreditCard');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});

    if (method) {
      setName(method.name);
      setIcon(method.icon);
    } else {
      setName('');
      setIcon('CreditCard');
    }
  }, [open, method]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};

    const trimmedName = name.trim();
    if (!trimmedName) {
      nextErrors.name = t('settings.methods.errors.enterName');
    } else {
      const duplicate = settings.paymentMethods.some(
        m => m.id !== method?.id && m.name.toLowerCase() === trimmedName.toLowerCase(),
      );
      if (duplicate) {
        nextErrors.name = t('settings.methods.errors.duplicateName', { name: trimmedName });
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    let id = method?.id;
    if (!id) {
      id = trimmedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      if (!id || settings.paymentMethods.some(m => m.id === id)) {
        id = `method-${Date.now()}`;
      }
    }

    const result: PaymentMethodConfig = {
      id,
      name: trimmedName,
      icon,
      behavior: method?.behavior ?? 'standard',
    };

    onSave(result);
    onOpenChange(false);
  }

  const CurrentIcon = getIcon(icon);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden border-border bg-popover p-0 text-foreground shadow-2xl sm:max-w-md max-h-[calc(100dvh-2rem)] flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <DialogHeader className="border-b border-border p-6 pr-14 shrink-0">
            <DialogTitle>{isEditing ? t('settings.methods.editTitle') : t('settings.methods.addTitle')}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {isEditing ? t('settings.methods.editDesc') : t('settings.methods.addDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 p-6 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
            <div className="space-y-2">
              <Label className="text-foreground">{t('settings.methods.methodName')}</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('settings.methods.namePlaceholder')}
                aria-invalid={Boolean(errors.name)}
                className="h-11 border-border bg-foreground/5 text-foreground placeholder:text-muted-foreground"
              />
              {errors.name && <div className="text-xs text-destructive">{errors.name}</div>}
            </div>

            <IconPicker value={icon} onChange={setIcon} label={t('common.icon')} />

            {method?.behavior === 'credit-card' && (
              <div className="rounded-lg bg-theme-cyan/10 border border-theme-cyan/30 p-3 text-xs text-theme-cyan">
                {t('settings.methods.creditCardNotice')}
              </div>
            )}

            <div className="pt-3 border-t border-border/60">
              <div className="text-xs text-muted-foreground mb-2">{t('common.livePreview')}</div>
              <div className="p-3 rounded-lg border border-border/60 bg-foreground/5 flex items-center justify-center gap-2">
                <CurrentIcon className="w-4 h-4 text-theme-cyan" />
                <span className="text-sm font-medium text-foreground">{name || t('settings.methods.methodName')}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border p-6 shrink-0 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="cyan">
              {isEditing ? t('common.saveChanges') : t('settings.methods.addMethod')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
