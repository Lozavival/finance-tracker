import { Menu } from 'lucide-react';
import { Button } from '@/components/primitives/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/primitives/sheet';
import { useI18n } from '@/i18n';
import { SidebarNavList } from './Sidebar';
import { useSidebar } from './SidebarContext';

export function MobileNavDrawer() {
  const { mobileOpen, setMobileOpen } = useSidebar();
  const { t } = useI18n();

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('nav.openMenu')}
          className="shrink-0 size-9 rounded-lg bg-foreground/5 border border-border hover:border-theme-cyan/50 hover:shadow-[0_0_15px_var(--shadow-glow-cyan)] transition-all"
        >
          <Menu className="size-5 text-foreground" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="w-72 max-w-[85vw] p-0 bg-background/95 backdrop-blur-xl border-r border-border flex flex-col z-50"
      >
        <SheetTitle className="sr-only">{t('nav.primary')}</SheetTitle>
        <div className="pt-6 flex-1 flex flex-col overflow-y-auto">
          <SidebarNavList onItemSelect={() => setMobileOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
