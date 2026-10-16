import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/primitives/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/primitives/radio-group';
import { type Transaction } from '@/data/transactions';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

export type DeletionScope = 'only-this' | 'this-and-future' | 'all';

export type DeleteTransactionDialogProps = {
  target: Transaction | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (scope?: DeletionScope) => void;
};

export function DeleteTransactionDialog({ target, onOpenChange, onConfirm }: DeleteTransactionDialogProps) {
  const { t, formatDate } = useI18n();
  const [scope, setScope] = useState<DeletionScope>('only-this');

  useEffect(() => {
    setScope('only-this');
  }, [target]);

  const isRecurring = Boolean(target?.recurring);

  return (
    <AlertDialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-popover border-border text-foreground sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isRecurring ? t('transactions.deleteRecurringTitle') : t('transactions.excludeConfirmTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {target
              ? target.transferId
                ? t('transactions.excludeTransferDesc')
                : target.installment
                  ? t('transactions.excludeInstallmentsDesc', {
                      count: String(target.installment.total),
                      description: target.description,
                    })
                  : target.recurring
                    ? t('transactions.deleteRecurringDesc', {
                        description: target.description,
                      })
                    : t('transactions.excludeSingleDesc', {
                        description: target.description,
                        date: formatDate(target.date),
                      })
              : t('transactions.excludeDefaultDesc')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isRecurring && (
          <RadioGroup value={scope} onValueChange={val => setScope(val as DeletionScope)} className="space-y-2 py-2">
            <label
              htmlFor="recurring-scope-only-this"
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border text-sm cursor-pointer transition-all',
                scope === 'only-this'
                  ? 'bg-theme-cyan/10 border-theme-cyan/50 text-foreground'
                  : 'border-border/60 bg-foreground/5 text-muted-foreground hover:bg-foreground/10',
              )}
            >
              <RadioGroupItem
                id="recurring-scope-only-this"
                value="only-this"
                className="text-theme-cyan border-border/80"
              />
              <div>
                <div className="font-medium text-foreground">{t('transactions.scopeOnlyThis')}</div>
                <div className="text-xs text-muted-foreground">{t('transactions.scopeOnlyThisDesc')}</div>
              </div>
            </label>

            <label
              htmlFor="recurring-scope-this-and-future"
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border text-sm cursor-pointer transition-all',
                scope === 'this-and-future'
                  ? 'bg-theme-cyan/10 border-theme-cyan/50 text-foreground'
                  : 'border-border/60 bg-foreground/5 text-muted-foreground hover:bg-foreground/10',
              )}
            >
              <RadioGroupItem
                id="recurring-scope-this-and-future"
                value="this-and-future"
                className="text-theme-cyan border-border/80"
              />
              <div>
                <div className="font-medium text-foreground">{t('transactions.scopeThisAndFuture')}</div>
                <div className="text-xs text-muted-foreground">{t('transactions.scopeThisAndFutureDesc')}</div>
              </div>
            </label>

            <label
              htmlFor="recurring-scope-all"
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border text-sm cursor-pointer transition-all',
                scope === 'all'
                  ? 'bg-theme-cyan/10 border-theme-cyan/50 text-foreground'
                  : 'border-border/60 bg-foreground/5 text-muted-foreground hover:bg-foreground/10',
              )}
            >
              <RadioGroupItem id="recurring-scope-all" value="all" className="text-theme-cyan border-border/80" />
              <div>
                <div className="font-medium text-foreground">{t('transactions.scopeAll')}</div>
                <div className="text-xs text-muted-foreground">{t('transactions.scopeAllDesc')}</div>
              </div>
            </label>
          </RadioGroup>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel className="border-border bg-foreground/5 text-foreground hover:bg-foreground/10 hover:text-foreground">
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(isRecurring ? scope : undefined)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('common.exclude')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
