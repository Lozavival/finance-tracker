import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/primitives/button';
import { useI18n } from '@/i18n';
import { useBreakpoint } from '@/lib/useMediaQuery';
import { type PageId, NAVIGATION_ITEMS } from './navigation';

export interface SidebarNavProps {
  activeItem?: PageId;
  onItemSelect?: (id: PageId) => void;
}

export function SidebarNavList({ activeItem, onItemSelect }: SidebarNavProps) {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav aria-label={t('nav.primary')} className="flex-1 px-4 py-6 space-y-2">
      {NAVIGATION_ITEMS.map((item, index) => {
        const Icon = item.icon;
        const isActive = activeItem
          ? activeItem === item.id
          : location.pathname === item.path ||
            (item.id === 'dashboard' && location.pathname === '/') ||
            (item.id === 'accounts' && location.pathname.startsWith('/accounts'));

        const handleClick = () => {
          void navigate(item.path);
          if (onItemSelect) onItemSelect(item.id);
        };

        return (
          <div key={item.id}>
            <Button
              variant="ghost"
              onClick={handleClick}
              className={`h-auto w-full justify-start gap-3 px-4 py-3 rounded-lg
                       transition-all duration-300 group relative overflow-hidden
                       ${
                         isActive
                           ? 'bg-theme-cyan/20 border border-theme-cyan/50 shadow-md shadow-[0_0_15px_var(--shadow-glow-cyan)]'
                           : 'bg-foreground/5 border border-border hover:border-theme-cyan/50 hover:shadow-md hover:shadow-[0_0_10px_var(--shadow-glow-cyan)]'
                       }`}
            >
              {/* Neon border accent on active */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-theme-cyan to-theme-blue shadow-md shadow-[0_0_10px_var(--shadow-glow-cyan)]" />
              )}

              <Icon
                className={`size-5 transition-colors ${
                  isActive ? 'text-theme-cyan' : 'text-muted-foreground group-hover:text-theme-cyan'
                }`}
              />
              <span
                className={`transition-colors ${
                  isActive ? 'text-theme-cyan font-semibold' : 'text-muted-foreground group-hover:text-foreground'
                }`}
              >
                {t(item.key)}
              </span>
            </Button>

            {/* Neon separator before Settings */}
            {index === 3 && (
              <div className="my-4 h-px bg-gradient-to-r from-transparent via-theme-cyan/40 to-transparent" />
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar(props: SidebarNavProps) {
  const { isDesktop } = useBreakpoint();

  if (!isDesktop) {
    return null;
  }

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-background/80 backdrop-blur-xl border-r border-border flex flex-col z-30">
      <SidebarNavList {...props} />
    </aside>
  );
}
