import { useState, useEffect, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { IconPicker } from './IconPicker';
import { getIcon, type IconKey } from '../../data/icons';
import { type PaymentMethodConfig } from '../../data/settings';
import { useSettings } from '../../state/SettingsContext';

type PaymentMethodDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  method?: PaymentMethodConfig | null;
  onSave: (saved: PaymentMethodConfig) => void;
};

export function PaymentMethodDialog({ open, onOpenChange, method, onSave }: PaymentMethodDialogProps) {
  const isEditing = Boolean(method);
  const { settings } = useSettings();

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
      nextErrors.name = 'Please enter a name for the payment method.';
    } else {
      const duplicate = settings.paymentMethods.some(
        m => m.name.toLowerCase() === trimmedName.toLowerCase() && m.id !== method?.id,
      );
      if (duplicate) {
        nextErrors.name = `A payment method named "${trimmedName}" already exists.`;
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
      <DialogContent className="gap-0 overflow-hidden border-border bg-popover p-0 text-foreground shadow-2xl sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-border p-6 pr-14">
            <DialogTitle>{isEditing ? 'Edit payment method' : 'Add payment method'}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {isEditing ? 'Update payment method label and icon.' : 'Add a new payment option for transactions.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 p-6">
            <div className="space-y-2">
              <Label className="text-foreground">Method Name</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Apple Pay, PayPal"
                aria-invalid={Boolean(errors.name)}
                className="h-11 border-border bg-foreground/5 text-foreground placeholder:text-muted-foreground"
              />
              {errors.name && <div className="text-xs text-red-400">{errors.name}</div>}
            </div>

            <IconPicker value={icon} onChange={setIcon} label="Icon" />

            {method?.behavior === 'credit-card' && (
              <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/30 p-3 text-xs text-cyan-300">
                This is the system credit card payment method linked to card statements, cycles, and installments.
              </div>
            )}

            <div className="pt-3 border-t border-border/60">
              <div className="text-xs text-muted-foreground mb-2">Live Preview</div>
              <div className="p-3 rounded-lg border border-border/60 bg-foreground/5 flex items-center justify-center gap-2">
                <CurrentIcon className="w-4 h-4 text-theme-cyan" />
                <span className="text-sm font-medium text-foreground">{name || 'Method Name'}</span>
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
              {isEditing ? 'Save changes' : 'Add method'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
