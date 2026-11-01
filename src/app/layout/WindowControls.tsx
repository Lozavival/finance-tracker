import { useEffect, useState } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import { Button } from '@/components/primitives/button';
import { useI18n } from '@/i18n';

export function WindowControls() {
  const { t } = useI18n();
  const [isElectron, setIsElectron] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI?.isElectron) {
      return;
    }
    setIsElectron(true);

    void window.electronAPI.isMaximized().then(setIsMaximized);

    const unsubscribe = window.electronAPI.onMaximizedChange(maximized => {
      setIsMaximized(maximized);
    });

    return unsubscribe;
  }, []);

  if (!isElectron || typeof window === 'undefined' || !window.electronAPI) {
    return null;
  }

  const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

  return (
    <div
      className="flex items-center gap-1 shrink-0 ml-1 pl-2 border-l border-border/40 app-no-drag"
      style={noDragStyle}
      aria-label={t('nav.primary')}
    >
      {/* Minimize Button */}
      <Button
        variant="ghost"
        size="icon"
        title={t('nav.minimizeWindow')}
        aria-label={t('nav.minimizeWindow')}
        className="size-8 rounded-md bg-transparent hover:bg-foreground/5 hover:border hover:border-border text-muted-foreground hover:text-foreground transition-all shrink-0 app-no-drag"
        onClick={() => void window.electronAPI?.minimize()}
        style={noDragStyle}
      >
        <Minus className="size-3.5" />
      </Button>

      {/* Maximize / Restore Button */}
      <Button
        variant="ghost"
        size="icon"
        title={isMaximized ? t('nav.restoreWindow') : t('nav.maximizeWindow')}
        aria-label={isMaximized ? t('nav.restoreWindow') : t('nav.maximizeWindow')}
        className="size-8 rounded-md bg-transparent hover:bg-foreground/5 hover:border hover:border-border text-muted-foreground hover:text-foreground transition-all shrink-0 app-no-drag"
        onClick={() => void window.electronAPI?.maximize()}
        style={noDragStyle}
      >
        {isMaximized ? <Copy className="size-3" /> : <Square className="size-3" />}
      </Button>

      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        title={t('nav.closeWindow')}
        aria-label={t('nav.closeWindow')}
        className="size-8 rounded-md bg-transparent hover:bg-destructive/20 hover:border hover:border-destructive/40 text-muted-foreground hover:text-destructive transition-all shrink-0 app-no-drag"
        onClick={() => void window.electronAPI?.close()}
        style={noDragStyle}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
