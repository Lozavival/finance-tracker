import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/primitives/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/primitives/card';
import { useI18n } from '@/i18n';

export type ErrorFallbackProps = {
  error: Error;
  resetErrorBoundary: () => void;
};

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const { t } = useI18n();

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

        <CardContent className="pt-2">
          <div className="p-3 rounded-lg bg-foreground/5 border border-border/40 font-mono text-xs text-muted-foreground break-words max-h-32 overflow-y-auto">
            {error.message || 'Unknown application error'}
          </div>
        </CardContent>

        <CardFooter className="flex gap-3 justify-end pt-4">
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
