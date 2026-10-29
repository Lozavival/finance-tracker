import { AlertTriangle, RefreshCw, Home, ClipboardCopy } from 'lucide-react';
import { Button } from '@/components/primitives/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/primitives/card';
import { useI18n } from '@/i18n';
import { useNotifications } from '@/state/NotificationsContext';
import { logger } from '@/lib/logger';

export type ErrorFallbackProps = {
  error: Error;
  resetErrorBoundary: () => void;
};

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const { t } = useI18n();
  const { notify } = useNotifications();

  const handleCopyLogs = async () => {
    try {
      const diagnosticBundle = [
        `Error: ${error.name}: ${error.message}`,
        error.stack ? `Stack:\n${error.stack}` : '',
        '',
        logger.exportLogs(),
      ].join('\n');

      await navigator.clipboard.writeText(diagnosticBundle);
      notify.success('errors.boundary.logsCopied');
    } catch (err) {
      logger.error('Failed to copy diagnostic logs to clipboard:', err);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[450px] p-6">
      <Card className="w-full max-w-md bg-card/60 backdrop-blur-xl border-border/40 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto size-12 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-3">
            <AlertTriangle className="size-6 text-destructive" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight text-foreground">
            {t('errors.boundary.title')}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {t('errors.boundary.description')}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-2 space-y-3">
          <div className="p-3 rounded-lg bg-foreground/5 border border-border/40 font-mono text-xs text-muted-foreground break-words max-h-32 overflow-y-auto">
            {error.message || 'Unknown application error'}
          </div>
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyLogs}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 h-8"
            >
              <ClipboardCopy className="size-3.5" />
              <span>{t('errors.boundary.copyLogs')}</span>
            </Button>
          </div>
        </CardContent>

        <CardFooter className="flex gap-3 justify-end pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.location.href = '/dashboard';
            }}
            className="flex items-center gap-1.5"
          >
            <Home className="size-4" />
            {t('errors.boundary.goHome')}
          </Button>
          <Button variant="default" size="sm" onClick={resetErrorBoundary} className="flex items-center gap-1.5">
            <RefreshCw className="size-4" />
            {t('errors.boundary.reload')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
