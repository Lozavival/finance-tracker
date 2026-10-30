import { useState, useMemo } from 'react';
import { Card } from '@/components/primitives/card';
import { Button } from '@/components/primitives/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useSettings } from '@/state/SettingsContext';
import { type TransactionTypeConfig, type Direction, COLOR_CONFIG } from '@/data/settings';
import { type Transaction } from '@/data/transactions';
import { CategoryChip } from '@/components/shared/CategoryChip';
import { SortableRow, useReorder } from './SortableList';
import { TransactionTypeDialog } from './TransactionTypeDialog';
import { DeleteTypeDialog } from './DeleteTypeDialog';
import { useNotify } from '@/state/NotificationsContext';
import { useI18n } from '@/i18n';

type TransactionTypesPanelProps = {
  transactions: Transaction[];
  onTransactionsChange: (txs: Transaction[]) => void;
};

export function TransactionTypesPanel({ transactions, onTransactionsChange }: TransactionTypesPanelProps) {
  const { settings, dispatch, incomeTypes, expenseTypes } = useSettings();
  const { t: translate } = useI18n();
  const notify = useNotify();

  const [dialogState, setDialogState] = useState<{
    open: boolean;
    typeConfig: TransactionTypeConfig | null;
    defaultDirection: Direction;
  }>({
    open: false,
    typeConfig: null,
    defaultDirection: 'expense',
  });

  const [deleteTarget, setDeleteTarget] = useState<TransactionTypeConfig | null>(null);

  // Compute transaction counts per type
  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of transactions) {
      counts.set(t.typeId, (counts.get(t.typeId) || 0) + 1);
    }
    return counts;
  }, [transactions]);

  function handleSaveType(saved: TransactionTypeConfig, linkedGoalId?: string) {
    const isExisting = settings.transactionTypes.some(t => t.id === saved.id);
    if (isExisting) {
      const p = dispatch({
        type: 'type/update',
        payload: {
          id: saved.id,
          changes: {
            name: saved.name,
            direction: saved.direction,
            color: saved.color,
            icon: saved.icon,
          },
        },
      });
      notify.successWhen(p, 'notifications.ops.typeUpdated', {
        id: `type-save-${saved.id}`,
        params: { name: saved.name },
      });
    } else {
      const p = dispatch({ type: 'type/add', payload: saved });
      notify.successWhen(p, 'notifications.ops.typeAdded', {
        id: `type-save-${saved.id}`,
        params: { name: saved.name },
      });
    }

    // Update goals typeMappings if direction is expense
    if (saved.direction === 'expense') {
      const nextMappings = { ...settings.goals.typeMappings };
      if (linkedGoalId) {
        nextMappings[saved.id] = linkedGoalId;
      } else {
        delete nextMappings[saved.id];
      }
      void dispatch({ type: 'goals/updateTypeMappings', payload: { mappings: nextMappings } });
    } else {
      // Clear mapping if converted to income
      if (settings.goals.typeMappings[saved.id]) {
        const nextMappings = { ...settings.goals.typeMappings };
        delete nextMappings[saved.id];
        void dispatch({ type: 'goals/updateTypeMappings', payload: { mappings: nextMappings } });
      }
    }
  }

  function handleReorderDirection(direction: Direction, reorderedList: TransactionTypeConfig[]) {
    // Preserve other direction's items and update this direction
    const nextList: TransactionTypeConfig[] = [];
    if (direction === 'income') {
      nextList.push(...reorderedList, ...expenseTypes);
    } else {
      nextList.push(...incomeTypes, ...reorderedList);
    }
    void dispatch({ type: 'type/reorder', payload: { types: nextList } });
  }

  const incomeReorder = useReorder(incomeTypes, list => handleReorderDirection('income', list));
  const expenseReorder = useReorder(expenseTypes, list => handleReorderDirection('expense', list));

  function renderTypeList(
    direction: Direction,
    types: TransactionTypeConfig[],
    reorderState: ReturnType<typeof useReorder<TransactionTypeConfig>>,
  ) {
    return (
      <div className="space-y-2">
        {types.map((t, idx) => {
          const count = typeCounts.get(t.id) || 0;
          const linkedGoalCatId = settings.goals?.typeMappings?.[t.id];
          const linkedGoal = linkedGoalCatId ? settings.goals?.categories.find(c => c.id === linkedGoalCatId) : null;

          return (
            <SortableRow
              key={t.id}
              index={idx}
              total={types.length}
              item={t}
              onMoveUp={() => reorderState.move(idx, idx - 1)}
              onMoveDown={() => reorderState.move(idx, idx + 1)}
              onDragStart={reorderState.handleDragStart(idx)}
              onDragOver={reorderState.handleDragOver}
              onDrop={reorderState.handleDrop(idx)}
              onDragEnd={reorderState.handleDragEnd}
              isDragging={reorderState.draggedIndex === idx}
            >
              <div className="flex items-center justify-between gap-3 min-w-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CategoryChip typeConfig={t} size="md" />
                  {t.system && (
                    <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-theme-purple/20 text-theme-purple border border-theme-purple/30">
                      {translate('settings.systemBadge')}
                    </span>
                  )}
                  {direction === 'expense' &&
                    !t.system &&
                    (linkedGoal ? (
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1.5 min-w-0 max-w-full truncate"
                        style={{
                          backgroundColor: COLOR_CONFIG[linkedGoal.color]?.badgeBg,
                          color: COLOR_CONFIG[linkedGoal.color]?.textColor,
                          borderColor: COLOR_CONFIG[linkedGoal.color]?.badgeBorder,
                        }}
                        title={translate('settings.types.linkedGoalTitle', { name: linkedGoal.name })}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: COLOR_CONFIG[linkedGoal.color]?.dotColor }}
                        />
                        <span className="truncate">{linkedGoal.name}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/60 px-2 py-0.5 rounded-full border border-border/40 hidden xl:inline">
                        {translate('settings.noGoalLinked')}
                      </span>
                    ))}
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {count === 1
                      ? translate('common.singleTransaction')
                      : translate('common.transactionsCount', { count: String(count) })}
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setDialogState({
                          open: true,
                          typeConfig: t,
                          defaultDirection: direction,
                        })
                      }
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-foreground/10"
                      title={translate('settings.types.editType')}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    {!t.system && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(t)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title={translate('settings.types.deleteType')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </SortableRow>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Types Card */}
        <Card className="p-6 bg-foreground/5 backdrop-blur-xl border border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-medium text-foreground">{translate('settings.typesIncomeTitle')}</div>
              <div className="text-xs text-muted-foreground">{translate('settings.typesIncomeDesc')}</div>
            </div>
            <Button
              size="sm"
              variant="cyan"
              onClick={() =>
                setDialogState({
                  open: true,
                  typeConfig: null,
                  defaultDirection: 'income',
                })
              }
              className="text-xs"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {translate('settings.addIncomeType')}
            </Button>
          </div>

          {renderTypeList('income', incomeTypes, incomeReorder)}
        </Card>

        {/* Expense Types Card */}
        <Card className="p-6 bg-foreground/5 backdrop-blur-xl border border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-medium text-foreground">{translate('settings.typesExpenseTitle')}</div>
              <div className="text-xs text-muted-foreground">{translate('settings.typesExpenseDesc')}</div>
            </div>
            <Button
              size="sm"
              variant="cyan"
              onClick={() =>
                setDialogState({
                  open: true,
                  typeConfig: null,
                  defaultDirection: 'expense',
                })
              }
              className="text-xs"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {translate('settings.addExpenseType')}
            </Button>
          </div>

          {renderTypeList('expense', expenseTypes, expenseReorder)}
        </Card>
      </div>

      <TransactionTypeDialog
        open={dialogState.open}
        onOpenChange={open => setDialogState(prev => ({ ...prev, open }))}
        typeConfig={dialogState.typeConfig}
        defaultDirection={dialogState.defaultDirection}
        transactions={transactions}
        onSave={handleSaveType}
      />

      <DeleteTypeDialog
        typeConfig={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        transactions={transactions}
        onTransactionsChange={onTransactionsChange}
      />
    </div>
  );
}
