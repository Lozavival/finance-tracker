import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/primitives/alert-dialog';
import { Button } from '@/components/primitives/button';
import { type AccountConfig, getAccountColor } from '@/data/settings';
import { useSettings } from '@/state/SettingsContext';
import { useI18n } from '@/i18n';
import { ArchiveRestore } from 'lucide-react';

export type RestoreAccountDialogProps = {
  account: AccountConfig | null;
  open: boolean;
  onClose: () => void;
  onRestored?: () => void;
};

export function RestoreAccountDialog({ account, open, onClose, onRestored }: RestoreAccountDialogProps) {
  const { dispatch } = useSettings();
  const { t } = useI18n();

  if (!account) return null;

  function handleRestore() {
    if (!account) return;
    dispatch({ type: 'account/unarchive', payload: { id: account.id } });
    onRestored?.();
    onClose();
  }

  return (
    <AlertDialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <AlertDialogContent className="bg-popover border-border text-foreground sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium shadow-sm flex-shrink-0"
              style={{ backgroundColor: getAccountColor(account.color) }}
            >
              {account.initials}
            </div>
            <AlertDialogTitle className="text-lg">{t('accounts.restoreDialog.title')}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-muted-foreground text-sm pt-2 text-left">
            {t('accounts.restoreDialog.desc', {
              name: account.name,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <AlertDialogCancel
            onClick={onClose}
            className="border-border bg-foreground/5 text-foreground hover:bg-foreground/10 hover:text-foreground"
          >
            {t('common.cancel')}
          </AlertDialogCancel>

          <Button type="button" variant="cyan" onClick={handleRestore} className="gap-1.5">
            <ArchiveRestore className="w-4 h-4" />
            {t('accounts.restoreDialog.confirmRestore')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
