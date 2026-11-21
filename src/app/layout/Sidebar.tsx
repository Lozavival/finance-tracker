import { useLocation, useNavigate } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/primitives/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useI18n } from '@/i18n';
import { useBreakpoint } from '@/lib/useMediaQuery';
import { cn } from '@/lib/utils';
import { type PageId, NAVIGATION_ITEMS } from './navigation';
import { useSidebar } from './SidebarContext';

export interface SidebarNavProps {
  activeItem?: PageId;
  onItemSelect?: (id: PageId) => void;
  collapsed?: boolean;
}

export function SidebarNavList({ activeItem, onItemSelect, collapsed = false }: SidebarNavProps) {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav aria-label={t('nav.primary')} className={cn('flex-1 py-6 space-y-2', collapsed ? 'px-3' : 'px-4')}>
      {NAVIGATION_ITEMS.map((item, index) => {
        const Icon = item.icon;
        const label = t(item.key);
        const isActive = activeItem
          ? activeItem === item.id
          : location.pathname === item.path ||
            (item.id === 'dashboard' && location.pathname === '/') ||
            (item.id === 'accounts' && location.pathname.startsWith('/accounts'));

        const handleClick = () => {
          void navigate(item.path);
          if (onItemSelect) onItemSelect(item.id);
        };

        const navButton = (
          <Button
            variant="ghost"
            onClick={handleClick}
            aria-label={label}
            className={cn(
              'h-auto w-full py-3 rounded-lg transition-all duration-300 group relative overflow-hidden',
              collapsed ? 'justify-center px-0' : 'justify-start gap-3 px-4',
              isActive
                ? 'bg-theme-cyan/20 border border-theme-cyan/50 shadow-md shadow-[0_0_15px_var(--shadow-glow-cyan)]'
                : 'bg-foreground/5 border border-border hover:border-theme-cyan/50 hover:shadow-md hover:shadow-[0_0_10px_var(--shadow-glow-cyan)]',
            )}
          >
            {/* Neon border accent on active */}
            {isActive && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-theme-cyan to-theme-blue shadow-md shadow-[0_0_10px_var(--shadow-glow-cyan)]" />
            )}

            <Icon
              className={cn(
                'size-5 shrink-0 transition-colors',
                isActive ? 'text-theme-cyan' : 'text-muted-foreground group-hover:text-theme-cyan',
              )}
            />
            {!collapsed && (
              <span
                className={cn(
                  'truncate transition-colors',
                  isActive ? 'text-theme-cyan font-semibold' : 'text-muted-foreground group-hover:text-foreground',
                )}
              >
                {label}
              </span>
            )}
          </Button>
        );

        return (
          <div key={item.id}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>{navButton}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {label}
                </TooltipContent>
              </Tooltip>
            ) : (
              navButton
            )}

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
  const { t } = useI18n();
  const { isDesktop } = useBreakpoint();
  const { collapsed, toggleCollapsed } = useSidebar();

  if (!isDesktop) {
    return null;
  }

  const toggleLabel = collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar');
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const shortcut = isMac ? '⌘B' : 'Ctrl+B';

  const toggleButton = (
    <Button
      variant="ghost"
      onClick={toggleCollapsed}
      aria-label={toggleLabel}
      aria-expanded={!collapsed}
      className={cn(
        'h-auto w-full py-2.5 rounded-lg bg-foreground/5 border border-border hover:border-theme-cyan/50 hover:shadow-[0_0_10px_var(--shadow-glow-cyan)] transition-all duration-300 group',
        collapsed ? 'justify-center px-0' : 'justify-between px-4',
      )}
    >
      <span className="flex items-center gap-3 min-w-0">
        {collapsed ? (
          <PanelLeftOpen className="size-5 shrink-0 text-muted-foreground group-hover:text-theme-cyan transition-colors" />
        ) : (
          <PanelLeftClose className="size-5 shrink-0 text-muted-foreground group-hover:text-theme-cyan transition-colors" />
        )}
        {!collapsed && (
          <span className="text-sm text-muted-foreground group-hover:text-foreground truncate transition-colors">
            {toggleLabel}
          </span>
        )}
      </span>
      {!collapsed && (
        <kbd className="text-[11px] font-mono text-muted-foreground/80 bg-background/60 border border-border rounded px-1.5 py-0.5 shrink-0">
          {shortcut}
        </kbd>
      )}
    </Button>
  );

  return (
    <aside
      data-collapsed={collapsed ? 'true' : 'false'}
      className={cn(
        'fixed left-0 top-16 bottom-0 bg-background/80 backdrop-blur-xl border-r border-border flex flex-col z-30 transition-[width] duration-300 ease-in-out overflow-x-hidden',
        collapsed ? 'w-20' : 'w-64',
      )}
    >
      <SidebarNavList {...props} collapsed={collapsed} />
      <div className={cn('border-border/60 py-3', collapsed ? 'px-3' : 'px-4')}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>{toggleButton}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {toggleLabel} ({shortcut})
            </TooltipContent>
          </Tooltip>
        ) : (
          toggleButton
        )}
      </div>
    </aside>
  );
}
