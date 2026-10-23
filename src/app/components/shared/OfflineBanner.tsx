import { WifiOff, RefreshCw, Loader2 } from 'lucide-react';
import { useFinance } from '@/state/FinanceContext';
import { useI18n } from '@/i18n';
import { Button } from '@/components/primitives/button';

export function OfflineBanner() {
  const { syncStatus, loadStatus, reloadWorkspace } = useFinance();
  const { t } = useI18n();

  if (loadStatus === 'loading') {
    return (
      <div className="bg-theme-cyan/10 border-b border-theme-cyan/20 px-4 py-2 flex items-center justify-center gap-2 text-xs text-theme-cyan">
        <Loader2 className="size-3.5 animate-spin" />
        <span>{t('notifications.system.loading')}</span>
      </div>
    );
  }

  if (syncStatus === 'offline') {
    return (
      <div className="bg-destructive/15 border-b border-destructive/30 px-4 py-2.5 flex items-center justify-between text-xs text-destructive-foreground">
        <div className="flex items-center gap-2">
          <WifiOff className="size-4 text-destructive shrink-0" />
          <span className="font-medium text-foreground">{t('notifications.system.offlineBanner')}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void reloadWorkspace().catch(() => {});
          }}
          className="h-7 px-2.5 text-xs border-border/40 hover:bg-foreground/10 text-foreground flex items-center gap-1.5"
        >
          <RefreshCw className="size-3" />
          <span>{t('notifications.retry')}</span>
        </Button>
      </div>
    );
  }

  return null;
}
