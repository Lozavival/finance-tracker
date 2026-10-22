import { Search, Sun, Moon, Monitor, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useI18n } from '@/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { NotificationCenter } from './NotificationCenter';

export function TopNavigation() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? (theme ?? 'system') : 'system';

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-16 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="relative flex items-center justify-end h-full px-6">
        {/* Search Bar - centered */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl px-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-cyan" />
            <input
              type="text"
              placeholder={t('nav.searchPlaceholder')}
              className="w-full h-10 pl-10 pr-4 bg-foreground/5 border border-theme-cyan/30 rounded-lg
                       text-foreground placeholder:text-muted-foreground outline-none
                       focus:border-theme-cyan focus:shadow-[0_0_20px_var(--shadow-glow-cyan)]
                       transition-all duration-300"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <NotificationCenter />

          {/* Theme Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title={t('nav.toggleTheme')}
                aria-label={t('nav.toggleTheme')}
                className="p-2 rounded-lg bg-foreground/5 border border-border hover:border-theme-cyan/50 hover:shadow-[0_0_15px_var(--shadow-glow-cyan)] transition-all duration-300 cursor-pointer"
              >
                {!mounted ? (
                  <span className="w-5 h-5 block" />
                ) : currentTheme === 'system' ? (
                  <Monitor className="w-5 h-5 text-muted-foreground" />
                ) : resolvedTheme === 'light' ? (
                  <Sun className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Moon className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border-border min-w-36">
              <DropdownMenuItem onClick={() => setTheme('system')} className="gap-2 cursor-pointer">
                <Monitor className="w-4 h-4 text-muted-foreground" />
                <span className="flex-1">{t('settings.themeSystem')}</span>
                {currentTheme === 'system' && <Check className="w-3.5 h-3.5 text-theme-cyan ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('light')} className="gap-2 cursor-pointer">
                <Sun className="w-4 h-4 text-theme-orange" />
                <span className="flex-1">{t('settings.themeLight')}</span>
                {currentTheme === 'light' && <Check className="w-3.5 h-3.5 text-theme-cyan ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')} className="gap-2 cursor-pointer">
                <Moon className="w-4 h-4 text-theme-cyan" />
                <span className="flex-1">{t('settings.themeDark')}</span>
                {currentTheme === 'dark' && <Check className="w-3.5 h-3.5 text-theme-cyan ml-auto" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
