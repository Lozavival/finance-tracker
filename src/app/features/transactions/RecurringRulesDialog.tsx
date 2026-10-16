import { useState } from 'react';
import { Repeat, Plus, Ban, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/primitives/dialog';
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
import { Button } from '@/components/primitives/button';
import { CategoryChip } from '@/components/shared/CategoryChip';
import { useFinance } from '@/state/FinanceContext';
import { useSettings } from '@/state/SettingsContext';
import { useI18n } from '@/i18n';
import type { RecurringRule } from '@/data/recurring';

export type RecurringRulesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddNew: () => void;
};

export function RecurringRulesDialog({ open, onOpenChange, onAddNew }: RecurringRulesDialogProps) {
  const { recurringRules, cancelRecurringRule, deleteRecurringRule } = useFinance();
  const { findAccount, findType } = useSettings();
  const { t, formatCurrency, formatDate } = useI18n();
  const [ruleToCancel, setRuleToCancel] = useState<RecurringRule | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<RecurringRule | null>(null);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="border-border bg-popover text-foreground sm:max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-5 border-b border-border pr-12">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Repeat className="w-5 h-5 text-theme-cyan" />
                  <span>{t('transactions.recurringRulesTitle')}</span>
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs">
                  {t('transactions.recurringRulesSubtitle')}
                </DialogDescription>
              </div>
              <Button
                variant="cyan"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onAddNew();
                }}
                className="h-8 px-3 gap-1.5 text-xs font-semibold shrink-0 mr-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('transactions.newRecurringRule')}</span>
              </Button>
            </div>
          </DialogHeader>

          <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
            {recurringRules.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-foreground/5 border border-border flex items-center justify-center mx-auto text-muted-foreground">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-foreground">{t('transactions.noRecurringRules')}</h4>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    {t('transactions.noRecurringRulesDesc')}
                  </p>
                </div>
              </div>
            ) : (
              recurringRules.map(rule => {
                const account = findAccount(rule.accountId);
                const typeConfig = findType(rule.typeId);
                const isIncome = rule.direction === 'income';
                const isActive = rule.status === 'active';

                return (
                  <div
                    key={rule.id}
                    className="p-3.5 sm:p-4 rounded-xl border border-border bg-foreground/5 hover:border-theme-cyan/30 transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground truncate">{rule.description}</span>
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                              isActive
                                ? 'bg-theme-green/10 text-theme-green border-theme-green/30'
                                : 'bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            {isActive ? t('transactions.statusActive') : t('transactions.statusCanceled')}
                          </span>
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                              rule.limit.kind === 'count'
                                ? 'bg-theme-orange/10 text-theme-orange border-theme-orange/25'
                                : 'bg-theme-cyan/10 text-theme-cyan border-theme-cyan/25'
                            }`}
                          >
                            {rule.limit.kind === 'count'
                              ? t('transactions.ruleCountLimit', { count: String(rule.limit.count) })
                              : t('transactions.ongoing')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                          {typeConfig && <CategoryChip typeConfig={typeConfig} size="sm" />}
                          {account && <span>• {account.name}</span>}
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{t('transactions.startsOn', { date: formatDate(rule.startDate) })}</span>
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`text-base font-bold tracking-tight ${
                            isIncome ? 'text-theme-green' : 'text-foreground'
                          }`}
                        >
                          {isIncome ? '+' : '−'}
                          {formatCurrency(rule.value)}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{t('transactions.valuePerMonth')}</div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-muted-foreground truncate">
                        {isActive ? t('transactions.ruleActiveDesc') : t('transactions.ruleCanceledDesc')}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {isActive && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setRuleToCancel(rule)}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-theme-orange hover:bg-theme-orange/10 gap-1"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>{t('transactions.stopRecurrence')}</span>
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setRuleToDelete(rule)}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{t('common.delete')}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(ruleToCancel)} onOpenChange={isOpen => !isOpen && setRuleToCancel(null)}>
        <AlertDialogContent className="border-border bg-popover text-foreground sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('transactions.stopRecurrenceTitle')}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {ruleToCancel ? t('transactions.stopRecurrenceDesc', { description: ruleToCancel.description }) : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-foreground/5 text-foreground hover:bg-foreground/10 hover:text-foreground">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (ruleToCancel) {
                  cancelRecurringRule(ruleToCancel.id);
                  setRuleToCancel(null);
                }
              }}
              className="bg-theme-orange/20 border border-theme-orange/40 text-theme-orange hover:bg-theme-orange/30"
            >
              {t('transactions.stopRecurrence')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(ruleToDelete)} onOpenChange={isOpen => !isOpen && setRuleToDelete(null)}>
        <AlertDialogContent className="border-border bg-popover text-foreground sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('transactions.deleteRuleConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {ruleToDelete ? t('transactions.deleteRuleConfirmDesc', { description: ruleToDelete.description }) : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-foreground/5 text-foreground hover:bg-foreground/10 hover:text-foreground">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (ruleToDelete) {
                  deleteRecurringRule(ruleToDelete.id);
                  setRuleToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
