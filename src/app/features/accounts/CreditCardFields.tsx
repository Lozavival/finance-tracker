import { Input } from '@/components/primitives/input';
import { Label } from '@/components/primitives/label';
import { InlineAlert } from '@/components/shared/InlineAlert';
import { useI18n } from '@/i18n';

export type CreditCardFormValues = {
  name: string;
  limit: string;
  closingDay: number | '';
  dueDay: number | '';
};

type CreditCardFieldsProps = {
  values: CreditCardFormValues;
  onChange: (values: CreditCardFormValues) => void;
  errors?: Partial<Record<keyof CreditCardFormValues, string>>;
  isEditing?: boolean;
};

export function CreditCardFields({ values, onChange, errors = {}, isEditing = false }: CreditCardFieldsProps) {
  const { t } = useI18n();

  function updateField<K extends keyof CreditCardFormValues>(key: K, val: CreditCardFormValues[K]) {
    onChange({ ...values, [key]: val });
  }

  const closing = typeof values.closingDay === 'number' ? values.closingDay : 0;
  const due = typeof values.dueDay === 'number' ? values.dueDay : 0;

  const showHint = closing >= 1 && closing <= 31 && due >= 1 && due <= 31;
  const dueNextMonth = due <= closing;

  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-foreground/[0.02] p-4">
      {isEditing && <InlineAlert variant="warning">{t('accounts.cardEditWarning')}</InlineAlert>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">{t('accounts.dialog.cardName')}</Label>
          <Input
            value={values.name}
            onChange={e => updateField('name', e.target.value)}
            placeholder={t('accounts.dialog.cardNamePlaceholder')}
            aria-invalid={Boolean(errors.name)}
            className="h-11 border-border bg-foreground/5 text-foreground placeholder:text-muted-foreground"
          />
          {errors.name && <div className="text-xs text-red-400">{errors.name}</div>}
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">{t('accounts.dialog.cardLimit')}</Label>
          <Input
            type="number"
            min="0"
            step="100"
            value={values.limit}
            onChange={e => updateField('limit', e.target.value)}
            placeholder="5000"
            aria-invalid={Boolean(errors.limit)}
            className="h-11 border-border bg-foreground/5 text-foreground placeholder:text-muted-foreground"
          />
          {errors.limit && <div className="text-xs text-red-400">{errors.limit}</div>}
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">{t('accounts.dialog.closingDay')}</Label>
          <Input
            type="number"
            min="1"
            max="31"
            value={values.closingDay}
            onChange={e => updateField('closingDay', e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="e.g. 25"
            aria-invalid={Boolean(errors.closingDay)}
            className="h-11 border-border bg-foreground/5 text-foreground placeholder:text-muted-foreground"
          />
          {errors.closingDay && <div className="text-xs text-red-400">{errors.closingDay}</div>}
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">{t('accounts.dialog.dueDay')}</Label>
          <Input
            type="number"
            min="1"
            max="31"
            value={values.dueDay}
            onChange={e => updateField('dueDay', e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="e.g. 5"
            aria-invalid={Boolean(errors.dueDay)}
            className="h-11 border-border bg-foreground/5 text-foreground placeholder:text-muted-foreground"
          />
          {errors.dueDay && <div className="text-xs text-red-400">{errors.dueDay}</div>}
        </div>
      </div>

      {showHint && (
        <div className="text-xs text-muted-foreground bg-cyan-500/5 border border-cyan-500/20 p-2.5 rounded-md">
          {t('accounts.billingCycleHint', {
            closing: String(closing),
            due: String(due),
            monthPlacement: dueNextMonth ? t('accounts.followingMonth') : t('accounts.sameMonth'),
          })}
        </div>
      )}
    </div>
  );
}
