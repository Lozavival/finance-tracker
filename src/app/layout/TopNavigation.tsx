import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/primitives/button';
import { useI18n } from '@/i18n';
import { useBreakpoint } from '@/lib/useMediaQuery';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { NotificationCenter } from './NotificationCenter';
import { GlobalSearch } from './GlobalSearch';
import { MobileNavDrawer } from './MobileNavDrawer';
import { WindowControls } from './WindowControls';

export function TopNavigation() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const { isDesktop } = useBreakpoint();

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? (theme ?? 'system') : 'system';
  const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

  const handleHeaderDoubleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('app-drag-region')) {
      void window.electronAPI?.maximize();
    }
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 h-16 bg-background/80 backdrop-blur-xl border-b border-border select-none app-drag-region"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      onDoubleClick={handleHeaderDoubleClick}
    >
      <div className="flex items-center justify-between h-full px-3 sm:px-6 gap-2 sm:gap-4 app-drag-region">
        {/* Left Section: Mobile Nav Drawer toggle on < lg */}
        <div className="flex items-center gap-2 shrink-0 app-no-drag" style={noDragStyle}>
          {!isDesktop && <MobileNavDrawer />}
        </div>

        {/* Search Bar - flex centered with draggable padding */}
        <div className="flex-1 min-w-0 flex justify-center max-w-xl mx-auto app-drag-region pointer-events-none">
          <div className="w-full pointer-events-auto app-no-drag" style={noDragStyle}>
            <GlobalSearch />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 relative z-10 app-no-drag" style={noDragStyle}>
          {/* Notification Bell */}
          <NotificationCenter />

          {/* Theme Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                title={t('nav.toggleTheme')}
                aria-label={t('nav.toggleTheme')}
                className="size-9 rounded-lg bg-foreground/5 border border-border hover:border-theme-cyan/50 hover:shadow-[0_0_15px_var(--shadow-glow-cyan)] transition-all shrink-0"
              >
                {!mounted ? (
                  <span className="size-5 block" />
                ) : currentTheme === 'system' ? (
                  <Monitor className="size-5 text-muted-foreground" />
                ) : resolvedTheme === 'light' ? (
                  <Sun className="size-5 text-theme-orange" />
                ) : (
                  <Moon className="size-5 text-theme-cyan" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border-border min-w-36">
              <DropdownMenuItem onClick={() => setTheme('system')} className="gap-2 cursor-pointer">
                <Monitor className="size-4 text-muted-foreground" />
                <span className="flex-1">{t('settings.themeSystem')}</span>
                {currentTheme === 'system' && <Check className="size-3.5 text-theme-cyan ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('light')} className="gap-2 cursor-pointer">
                <Sun className="size-4 text-theme-orange" />
                <span className="flex-1">{t('settings.themeLight')}</span>
                {currentTheme === 'light' && <Check className="size-3.5 text-theme-cyan ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')} className="gap-2 cursor-pointer">
                <Moon className="size-4 text-theme-cyan" />
                <span className="flex-1">{t('settings.themeDark')}</span>
                {currentTheme === 'dark' && <Check className="size-3.5 text-theme-cyan ml-auto" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Desktop Window Controls (Minimize / Maximize / Close) */}
          <WindowControls />
        </div>
      </div>
    </header>
  );
}
