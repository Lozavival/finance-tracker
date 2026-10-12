import { useState, useMemo } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useSettings } from '../../state/SettingsContext';
import { type TransactionTypeConfig, type Direction, COLOR_CONFIG } from '../../data/settings';
import { type Transaction } from '../../data/transactions';
import { CategoryChip } from '../shared/CategoryChip';
import { SortableRow, useReorder } from './SortableList';
import { TransactionTypeDialog } from './TransactionTypeDialog';
import { DeleteTypeDialog } from './DeleteTypeDialog';

type TransactionTypesPanelProps = {
  transactions: Transaction[];
  onTransactionsChange: (txs: Transaction[]) => void;
};

export function TransactionTypesPanel({ transactions, onTransactionsChange }: TransactionTypesPanelProps) {
  const { settings, dispatch, incomeTypes, expenseTypes } = useSettings();

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
      dispatch({
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
    } else {
      dispatch({ type: 'type/add', payload: saved });
    }

    // Update goals typeMappings if direction is expense
    if (saved.direction === 'expense') {
      const nextMappings = { ...settings.goals.typeMappings };
      if (linkedGoalId) {
        nextMappings[saved.id] = linkedGoalId;
      } else {
        delete nextMappings[saved.id];
      }
      dispatch({ type: 'goals/updateTypeMappings', payload: { mappings: nextMappings } });
    } else {
      // Clear mapping if converted to income
      if (settings.goals.typeMappings[saved.id]) {
        const nextMappings = { ...settings.goals.typeMappings };
        delete nextMappings[saved.id];
        dispatch({ type: 'goals/updateTypeMappings', payload: { mappings: nextMappings } });
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
    dispatch({ type: 'type/reorder', payload: { types: nextList } });
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
              isDragging={reorderState.draggedIndex === idx}
            >
              <div className="flex items-center justify-between gap-3 min-w-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CategoryChip typeConfig={t} size="md" />
                  {t.system && (
                    <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      System
                    </span>
                  )}
                  {direction === 'expense' &&
                    !t.system &&
                    (linkedGoal ? (
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1.5 max-w-[150px] truncate"
                        style={{
                          backgroundColor: COLOR_CONFIG[linkedGoal.color]?.badgeBg,
                          color: COLOR_CONFIG[linkedGoal.color]?.textColor,
                          borderColor: COLOR_CONFIG[linkedGoal.color]?.badgeBorder,
                        }}
                        title={`Linked goal: ${linkedGoal.name}`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: COLOR_CONFIG[linkedGoal.color]?.dotColor }}
                        />
                        <span className="truncate">{linkedGoal.name}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/60 px-2 py-0.5 rounded-full border border-border/40 hidden md:inline">
                        No goal linked
                      </span>
                    ))}
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {count} {count === 1 ? 'transaction' : 'transactions'}
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
                      title="Edit type"
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
                        title="Delete type"
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
              <div className="text-lg font-medium text-foreground">Income Categories</div>
              <div className="text-xs text-muted-foreground">Classify sources of income and credits.</div>
            </div>
            <Button
              size="sm"
              onClick={() =>
                setDialogState({
                  open: true,
                  typeConfig: null,
                  defaultDirection: 'income',
                })
              }
              className="bg-theme-cyan-btn text-white dark:text-gray-950 hover:bg-theme-cyan-btn-hover text-xs shadow-md shadow-cyan-500/20"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add income type
            </Button>
          </div>

          {renderTypeList('income', incomeTypes, incomeReorder)}
        </Card>

        {/* Expense Types Card */}
        <Card className="p-6 bg-foreground/5 backdrop-blur-xl border border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-medium text-foreground">Expense Categories</div>
              <div className="text-xs text-muted-foreground">Classify regular expenses, bills, and purchases.</div>
            </div>
            <Button
              size="sm"
              onClick={() =>
                setDialogState({
                  open: true,
                  typeConfig: null,
                  defaultDirection: 'expense',
                })
              }
              className="bg-theme-cyan-btn text-white dark:text-gray-950 hover:bg-theme-cyan-btn-hover text-xs shadow-md shadow-cyan-500/20"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add expense type
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
