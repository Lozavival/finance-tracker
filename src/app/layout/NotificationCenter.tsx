import { useState } from 'react';
import { Bell, CheckCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/primitives/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { ScrollArea } from '@/components/primitives/scroll-area';
import { useI18n } from '@/i18n';
import { useNotifications } from '@/state/NotificationsContext';
import { useFinancialAlerts } from '@/state/useFinancialAlerts';
import { NotificationAlertItem } from './NotificationAlertItem';
import { NotificationActivityList } from './NotificationActivityList';

export function NotificationCenter() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'alerts' | 'activity'>('alerts');

  const { activity, clearActivity, alertState, markAlertsRead, dismissAlert, markActivityRead, unreadActivityCount } =
    useNotifications();
  const { alerts, unreadCount: unreadAlertsCount, hasCritical } = useFinancialAlerts();

  const totalUnreadCount = unreadAlertsCount + unreadActivityCount;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
  }

  function handleMarkAllRead() {
    if (alerts.length > 0) {
      markAlertsRead(alerts.map(a => a.key));
    }
    markActivityRead();
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={t('nav.notifications')}
          className="relative p-2 rounded-lg bg-foreground/5 border border-border hover:border-theme-cyan/50 hover:shadow-[0_0_15px_var(--shadow-glow-cyan)] transition-all duration-300 cursor-pointer"
        >
          <Bell className="size-5 text-muted-foreground" />
          {totalUnreadCount > 0 && (
            <span
              className={`absolute -top-1 -right-1 z-10 pointer-events-none min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold rounded-full ${
                hasCritical
                  ? 'bg-theme-red text-white animate-pulse shadow-[0_0_10px_var(--shadow-glow-red)]'
                  : 'bg-theme-cyan text-primary-foreground shadow-[0_0_10px_var(--shadow-glow-cyan)]'
              }`}
            >
              {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-96 max-h-[85vh] flex flex-col p-4 bg-popover/95 backdrop-blur-xl border-border/40 shadow-2xl rounded-2xl overflow-hidden"
      >
        <div className="flex flex-col flex-1 min-h-0 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-border/60 shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight">{t('notifications.title')}</h3>
              {totalUnreadCount > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {t('notifications.unreadCount', { count: totalUnreadCount })}
                </p>
              )}
            </div>

            {totalUnreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
              >
                <CheckCheck className="size-3.5 text-theme-cyan" />
                <span>{t('notifications.markAllRead')}</span>
              </Button>
            )}
          </div>

          {/* Tabs for Alerts vs Activity */}
          <Tabs
            value={activeTab}
            onValueChange={v => setActiveTab(v as 'alerts' | 'activity')}
            className="flex flex-col flex-1 min-h-0"
          >
            <TabsList className="grid grid-cols-2 bg-foreground/5 border border-border/40 p-0.5 rounded-lg h-8 shrink-0">
              <TabsTrigger value="alerts" className="text-xs h-7 gap-1.5 data-[state=active]:bg-card cursor-pointer">
                <span>{t('notifications.alertsTab')}</span>
                {alerts.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-foreground/10 text-foreground font-semibold">
                    {alerts.length}
                  </span>
                )}
                {unreadAlertsCount > 0 && <span className="size-1.5 rounded-full bg-theme-cyan shrink-0" />}
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs h-7 gap-1.5 data-[state=active]:bg-card cursor-pointer">
                <span>{t('notifications.activityTab')}</span>
                {activity.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-foreground/10 text-muted-foreground font-semibold">
                    {activity.length}
                  </span>
                )}
                {unreadActivityCount > 0 && <span className="size-1.5 rounded-full bg-theme-cyan shrink-0" />}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="alerts" className="flex-1 min-h-0 mt-3 focus-visible:outline-none">
              {alerts.length > 0 ? (
                <ScrollArea className="h-[360px] max-h-[50vh] pr-3">
                  <div className="space-y-2.5 pb-1">
                    {alerts.map(alert => (
                      <NotificationAlertItem
                        key={alert.key}
                        alert={alert}
                        state={alertState[alert.key]}
                        onDismiss={dismissAlert}
                        onMarkRead={key => markAlertsRead([key])}
                        onClose={() => setOpen(false)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="py-8 px-4 flex flex-col items-center justify-center text-center">
                  <div className="p-2.5 rounded-full bg-theme-green/15 text-theme-green mb-2.5">
                    <CheckCircle2 className="size-6" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">{t('notifications.emptyAlerts')}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="activity" className="flex-1 min-h-0 mt-3 focus-visible:outline-none">
              <NotificationActivityList activity={activity} onClear={clearActivity} />
            </TabsContent>
          </Tabs>
        </div>
      </PopoverContent>
    </Popover>
  );
}
