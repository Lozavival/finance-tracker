import { useEffect, useState } from 'react';
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
import { useI18n } from '@/i18n';

export function QuitConfirmationDialog() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI?.isElectron) {
      return;
    }

    const unsubscribe = window.electronAPI.onConfirmQuitRequested?.(() => {
      setOpen(true);
    });

    return unsubscribe;
  }, []);

  if (typeof window === 'undefined' || !window.electronAPI?.isElectron) {
    return null;
  }

  const handleConfirmQuit = () => {
    setOpen(false);
    void window.electronAPI?.quitApp?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto bg-card/95 backdrop-blur-xl border-border">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('nav.quitConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('nav.quitConfirmDesc')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmQuit}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('nav.quitConfirmAction')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
