import { useState, useMemo } from 'react';
import { Card } from '@/components/primitives/card';
import { Button } from '@/components/primitives/button';
import { Plus, Pencil } from 'lucide-react';
import { useSettings } from '@/state/SettingsContext';
import { type PaymentMethodConfig } from '@/data/settings';
import { type Transaction } from '@/data/transactions';
import { getIcon } from '@/data/icons';
import { SortableRow, useReorder } from './SortableList';
import { PaymentMethodDialog } from './PaymentMethodDialog';
import { useI18n } from '@/i18n';

type PaymentMethodsPanelProps = {
  transactions: Transaction[];
};

export function PaymentMethodsPanel({ transactions }: PaymentMethodsPanelProps) {
  const { settings, dispatch } = useSettings();
  const { t, getTranslatedMethodName } = useI18n();

  const [dialogState, setDialogState] = useState<{
    open: boolean;
    method: PaymentMethodConfig | null;
  }>({
    open: false,
    method: null,
  });

  // Transaction count per payment method
  const methodCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of transactions) {
      if (t.paymentMethodId) {
        counts.set(t.paymentMethodId, (counts.get(t.paymentMethodId) || 0) + 1);
      }
    }
    return counts;
  }, [transactions]);

  function handleSaveMethod(saved: PaymentMethodConfig) {
    const isExisting = settings.paymentMethods.some(m => m.id === saved.id);
    if (isExisting) {
      dispatch({
        type: 'method/update',
        payload: {
          id: saved.id,
          changes: {
            name: saved.name,
            icon: saved.icon,
          },
        },
      });
    } else {
      dispatch({ type: 'method/add', payload: saved });
    }
  }

  const reorder = useReorder(settings.paymentMethods, methods =>
    dispatch({ type: 'method/reorder', payload: { methods } }),
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="p-6 bg-foreground/5 backdrop-blur-xl border border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-lg font-medium text-foreground">{t('settings.methodsTitle')}</div>
            <div className="text-xs text-muted-foreground">{t('settings.methodsDesc')}</div>
          </div>
          <Button
            size="sm"
            onClick={() => setDialogState({ open: true, method: null })}
            className="bg-theme-cyan-btn text-white dark:text-gray-950 hover:bg-theme-cyan-btn-hover text-xs shadow-md shadow-cyan-500/20"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {t('settings.addPaymentMethod')}
          </Button>
        </div>

        <div className="space-y-2">
          {settings.paymentMethods.map((m, idx) => {
            const count = methodCounts.get(m.id) || 0;
            const Icon = getIcon(m.icon);
            const isCard = m.behavior === 'credit-card';

            return (
              <SortableRow
                key={m.id}
                index={idx}
                total={settings.paymentMethods.length}
                item={m}
                onMoveUp={() => reorder.move(idx, idx - 1)}
                onMoveDown={() => reorder.move(idx, idx + 1)}
                onDragStart={reorder.handleDragStart(idx)}
                onDragOver={reorder.handleDragOver}
                onDrop={reorder.handleDrop(idx)}
                isDragging={reorder.draggedIndex === idx}
              >
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-foreground/5 border border-border flex items-center justify-center text-theme-cyan flex-shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-foreground truncate">
                        {getTranslatedMethodName(m.id, m.name)}
                      </span>

                      {isCard && (
                        <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-theme-cyan border border-cyan-500/30">
                          {t('settings.methods.creditCardBilling')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {count === 1
                        ? t('common.singleTransaction')
                        : t('common.transactionsCount', { count: String(count) })}
                    </span>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setDialogState({ open: true, method: m })}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-foreground/10"
                      title={t('settings.methods.editTitle')}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </SortableRow>
            );
          })}
        </div>
      </Card>

      <PaymentMethodDialog
        open={dialogState.open}
        onOpenChange={open => setDialogState(prev => ({ ...prev, open }))}
        method={dialogState.method}
        onSave={handleSaveMethod}
      />
    </div>
  );
}
