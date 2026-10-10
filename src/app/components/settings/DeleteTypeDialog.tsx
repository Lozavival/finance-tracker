import { useState, useMemo } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { type TransactionTypeConfig } from '../../data/settings';
import { type Transaction } from '../../data/transactions';
import { useSettings } from '../../state/SettingsContext';
import { OptionSelect } from '../transactions/OptionSelect';
import { CategoryChip } from '../shared/CategoryChip';
import { AlertCircle } from 'lucide-react';

type DeleteTypeDialogProps = {
  typeConfig: TransactionTypeConfig | null;
  onClose: () => void;
  transactions: Transaction[];
  onTransactionsChange: (txs: Transaction[]) => void;
};

export function DeleteTypeDialog({ typeConfig, onClose, transactions, onTransactionsChange }: DeleteTypeDialogProps) {
  const { settings, dispatch } = useSettings();
  const [replacementTypeId, setReplacementTypeId] = useState<string>('');

  const open = Boolean(typeConfig);

  // Filter transactions that use this type
  const matchingTransactions = useMemo(() => {
    if (!typeConfig) return [];
    return transactions.filter(t => t.typeId === typeConfig.id);
  }, [typeConfig, transactions]);

  // Available replacement types: same direction, excluding current type
  const availableReplacements = useMemo(() => {
    if (!typeConfig) return [];
    return settings.transactionTypes.filter(t => t.direction === typeConfig.direction && t.id !== typeConfig.id);
  }, [typeConfig, settings.transactionTypes]);

  // Is this the last type in this direction?
  const isOnlyTypeInDirection = availableReplacements.length === 0;

  const replacementOptions = useMemo(() => {
    return availableReplacements.map(t => ({
      value: t.id,
      label: t.name,
      customContent: <CategoryChip typeConfig={t} size="sm" />,
    }));
  }, [availableReplacements]);

  if (!typeConfig) return null;

  const hasTransactions = matchingTransactions.length > 0;
  const canDelete = !typeConfig.system && !isOnlyTypeInDirection && (!hasTransactions || Boolean(replacementTypeId));

  function handleDelete() {
    if (!canDelete || !typeConfig) return;

    if (hasTransactions && replacementTypeId) {
      // Reassign transactions
      const nextTxs = transactions.map(t => {
        if (t.typeId === typeConfig.id) {
          return { ...t, typeId: replacementTypeId };
        }
        return t;
      });
      onTransactionsChange(nextTxs);
    }

    dispatch({ type: 'type/remove', payload: { id: typeConfig.id } });
    onClose();
  }

  return (
    <AlertDialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <AlertDialogContent className="bg-popover border-border text-foreground sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{typeConfig.name}"?</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground space-y-3">
            {typeConfig.system ? (
              <span className="block text-red-400">This is a system transaction type and cannot be deleted.</span>
            ) : isOnlyTypeInDirection ? (
              <span className="block text-red-400">
                Cannot delete this type because there must be at least one {typeConfig.direction} type.
              </span>
            ) : hasTransactions ? (
              <>
                <span className="block">
                  <strong className="text-foreground">{matchingTransactions.length}</strong> transaction
                  {matchingTransactions.length === 1 ? '' : 's'} currently use{' '}
                  <strong className="text-foreground">{typeConfig.name}</strong>.
                </span>
                <span className="block text-foreground font-medium">
                  Please select another {typeConfig.direction} type to reassign them to before deleting:
                </span>
              </>
            ) : (
              <span className="block">
                This category is not used by any transaction and will be removed permanently.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {hasTransactions && !isOnlyTypeInDirection && (
          <div className="py-2">
            <OptionSelect
              label="Reassign transactions to"
              value={replacementTypeId}
              options={replacementOptions}
              onChange={setReplacementTypeId}
            />
          </div>
        )}

        {hasTransactions && !replacementTypeId && !isOnlyTypeInDirection && (
          <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 p-2.5 rounded-md border border-amber-500/20">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Select a replacement type to proceed with deletion.</span>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={onClose}
            className="border-border bg-foreground/5 text-foreground hover:bg-foreground/10 hover:text-foreground"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={!canDelete}
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            {hasTransactions ? 'Reassign and delete' : 'Delete type'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
