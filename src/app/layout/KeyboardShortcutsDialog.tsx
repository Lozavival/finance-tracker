import { useEffect, useState } from 'react';
import { Keyboard } from 'lucide-react';
import { Button } from '@/components/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/primitives/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useI18n } from '@/i18n';

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  items: ShortcutItem[];
}

function ShortcutKey({ label }: { label: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-6 px-1.5 py-0.5 text-[11px] font-mono font-medium text-foreground bg-background/80 border border-border rounded shadow-xs">
      {label}
    </kbd>
  );
}

export function KeyboardShortcutsDialog() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const mod = isMac ? '⌘' : 'Ctrl';
  const isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        const isEditable = (document.activeElement as HTMLElement | null)?.isContentEditable;
        if (activeTag !== 'input' && activeTag !== 'textarea' && activeTag !== 'select' && !isEditable) {
          e.preventDefault();
          setOpen(prev => !prev);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const groups: ShortcutGroup[] = [
    {
      title: t('shortcuts.groupNavigation'),
      items: [
        { keys: [mod, 'K'], description: t('shortcuts.globalSearch') },
        { keys: ['/'], description: t('shortcuts.quickSearch') },
        { keys: [mod, 'B'], description: t('shortcuts.toggleSidebar') },
        { keys: ['?'], description: t('shortcuts.openDialog') },
      ],
    },
    {
      title: t('shortcuts.groupControls'),
      items: [
        { keys: ['Enter'], description: t('shortcuts.confirmAction') },
        { keys: ['Esc'], description: t('shortcuts.closeOverlay') },
        { keys: ['↑', '↓'], description: t('shortcuts.navigateOptions') },
      ],
    },
  ];

  if (isElectron) {
    groups.push({
      title: t('shortcuts.groupDesktop'),
      items: [
        { keys: [mod, 'R'], description: t('shortcuts.reloadWindow') },
        { keys: [mod, 'Q'], description: t('shortcuts.quitApp') },
        { keys: ['F12'], description: t('shortcuts.toggleDevTools') },
      ],
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('shortcuts.title')}
              className="hidden sm:inline-flex size-9 rounded-lg bg-foreground/5 border border-border hover:border-theme-cyan/50 hover:shadow-[0_0_15px_var(--shadow-glow-cyan)] transition-all shrink-0"
            >
              <Keyboard className="size-5 text-muted-foreground" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8}>
          {t('shortcuts.title')} (?)
        </TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto bg-card/95 backdrop-blur-xl border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Keyboard className="size-5 text-theme-cyan" />
            {t('shortcuts.title')}
          </DialogTitle>
          <DialogDescription>{t('shortcuts.subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {groups.map(group => (
            <div key={group.title} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.title}</h3>
              <div className="rounded-lg border border-border/60 bg-foreground/5 divide-y divide-border/40">
                {group.items.map(item => (
                  <div key={item.description} className="flex items-center justify-between gap-4 px-3 py-2.5 text-sm">
                    <span className="text-foreground">{item.description}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((key, idx) => (
                        <span key={`${key}-${idx}`} className="inline-flex items-center gap-1">
                          {idx > 0 && <span className="text-xs text-muted-foreground">+</span>}
                          <ShortcutKey label={key} />
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
