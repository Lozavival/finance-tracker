import { Label } from '@/components/primitives/label';
import { Toggle } from '@/components/primitives/toggle';
import { getIcon } from '@/data/icons';
import type { PaymentMethodConfig } from '@/data/settings';
import type { AccountKind } from '@/data/settings';
import { InlineAlert } from '@/components/shared/InlineAlert';
import { useI18n } from '@/i18n';

interface AccountPaymentMethodsSelectorProps {
  kind: AccountKind;
  paymentMethods: PaymentMethodConfig[];
  selectedMethods: string[];
  onToggleMethod: (methodId: string) => void;
  methodError?: string;
  methodWarning?: string;
}

export function AccountPaymentMethodsSelector({
  kind,
  paymentMethods,
  selectedMethods,
  onToggleMethod,
  methodError,
  methodWarning,
}: AccountPaymentMethodsSelectorProps) {
  const { t, getTranslatedMethodName } = useI18n();

  if (kind === 'Cash') {
    const CashIcon = getIcon('Banknote');
    return (
      <div className="pt-4 border-t border-border space-y-2">
        <div>
          <Label className="text-foreground">{t('accounts.dialog.paymentMethods')}</Label>
          <div className="text-xs text-muted-foreground mt-0.5">{t('accounts.dialog.cashDesc')}</div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs px-3 py-1.5 font-medium">
            <CashIcon className="w-3.5 h-3.5" />
            <span>{t('accounts.dialog.cashDedicated')}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 border-t border-border space-y-3">
      <div>
        <Label className="text-foreground">{t('accounts.dialog.paymentMethods')}</Label>
        <div className="text-xs text-muted-foreground mt-0.5">{t('accounts.dialog.bankMethodsDesc')}</div>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        {paymentMethods
          .filter(m => m.id !== 'cash')
          .map(m => {
            const Icon = getIcon(m.icon);
            const isSelected = selectedMethods.includes(m.id);
            return (
              <Toggle
                key={m.id}
                pressed={isSelected}
                onPressedChange={() => onToggleMethod(m.id)}
                variant="outline"
                className="rounded-full border-border bg-foreground/5 hover:bg-foreground/10 data-[state=on]:border-cyan-500/40 data-[state=on]:bg-cyan-500/10 data-[state=on]:text-theme-cyan text-xs px-3 py-1.5 flex items-center gap-1.5 h-auto transition-all cursor-pointer"
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{getTranslatedMethodName(m.id, m.name)}</span>
              </Toggle>
            );
          })}
      </div>
      {methodError && <div className="text-xs text-red-400">{methodError}</div>}
      {methodWarning && <InlineAlert variant="destructive">{methodWarning}</InlineAlert>}
    </div>
  );
}
