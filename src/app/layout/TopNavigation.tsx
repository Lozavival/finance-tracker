import { Search, Bell, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useI18n } from '@/i18n';

export function TopNavigation() {
  const { setTheme, resolvedTheme } = useTheme();
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const hasNotification = true;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-16 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="relative flex items-center justify-end h-full px-6">
        {/* Search Bar - centered */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl px-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
            <input
              type="text"
              placeholder={t('nav.searchPlaceholder')}
              className="w-full h-10 pl-10 pr-4 bg-foreground/5 border border-cyan-500/30 rounded-lg
                       text-foreground placeholder:text-muted-foreground outline-none
                       focus:border-cyan-400 focus:shadow-[0_0_20px_var(--shadow-glow-cyan)]
                       transition-all duration-300"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <button
            type="button"
            title={t('nav.notifications')}
            className="relative p-2 rounded-lg bg-foreground/5 border border-border hover:border-cyan-400/50 hover:shadow-[0_0_15px_var(--shadow-glow-cyan)] transition-all duration-300"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            {hasNotification && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_var(--shadow-glow-cyan-intense)]" />
            )}
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            title={t('nav.toggleTheme')}
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg bg-foreground/5 border border-border hover:border-cyan-400/50 hover:shadow-[0_0_15px_var(--shadow-glow-cyan)] transition-all duration-300"
          >
            {mounted && resolvedTheme === 'light' ? (
              <Moon className="w-5 h-5 text-muted-foreground" />
            ) : (
              <Sun className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
