import { CheckCircle2, AlertCircle, Info, Trash2 } from 'lucide-react';
import { Button } from '@/components/primitives/button';
import { ScrollArea } from '@/components/primitives/scroll-area';
import { useI18n, type TranslationKey } from '@/i18n';
import { type ActivityEntry } from '@/data/notifications';
import { formatDistanceToNow } from 'date-fns';
import { logger } from '@/lib/logger';

const activityLogger = logger.child('NotificationActivity');

interface NotificationActivityListProps {
  activity: ActivityEntry[];
  onClear: () => void;
}

export function NotificationActivityList({ activity, onClear }: NotificationActivityListProps) {
  const { t, dateLocale } = useI18n();

  function getLevelIcon(level: ActivityEntry['level']) {
    switch (level) {
      case 'success':
        return <CheckCircle2 className="size-4 shrink-0 text-theme-green" />;
      case 'error':
        return <AlertCircle className="size-4 shrink-0 text-theme-red" />;
      case 'warning':
        return <AlertCircle className="size-4 shrink-0 text-theme-orange" />;
      case 'info':
      default:
        return <Info className="size-4 shrink-0 text-theme-cyan" />;
    }
  }

  function formatRelativeTime(isoString: string): string {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    try {
      return formatDistanceToNow(d, { addSuffix: true, locale: dateLocale });
    } catch (err) {
      activityLogger.warn('Failed to format relative time for activity notification:', { isoString, error: err });
      return '';
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-2">
      {activity.length > 0 && (
        <div className="flex items-center justify-between pb-1 shrink-0">
          <span className="text-[11px] text-muted-foreground">
            {t('notifications.eventsCount', { count: activity.length })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-destructive gap-1 cursor-pointer"
          >
            <Trash2 className="size-3" />
            <span>{t('notifications.clear')}</span>
          </Button>
        </div>
      )}

      {activity.length > 0 ? (
        <ScrollArea className="h-[340px] max-h-[48vh] pr-3">
          <div className="space-y-2 pb-1">
            {activity.map(item => (
              <div
                key={item.id}
                className="p-2.5 rounded-lg border border-border/50 bg-foreground/5 backdrop-blur-sm flex items-start gap-2.5 text-xs"
              >
                <div className="mt-0.5">{getLevelIcon(item.level)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-foreground text-xs leading-snug">
                      {t(item.messageKey as TranslationKey, item.params)}
                    </p>
                    {!item.readAt && (
                      <span className="size-1.5 shrink-0 rounded-full bg-theme-cyan mt-1 shadow-[0_0_6px_var(--shadow-glow-cyan)]" />
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{formatRelativeTime(item.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="py-8 px-4 flex flex-col items-center justify-center text-center">
          <div className="p-2.5 rounded-full bg-foreground/5 text-muted-foreground mb-2">
            <Info className="size-5" />
          </div>
          <p className="text-xs text-muted-foreground">{t('notifications.emptyActivity')}</p>
        </div>
      )}
    </div>
  );
}
