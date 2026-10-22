import { useNavigate } from 'react-router-dom';
import { Flame, AlertTriangle, TrendingDown, Clock, Sparkles, ArrowRight, X, Info, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/primitives/button';
import { useI18n, type TranslationKey } from '@/i18n';
import { type FinancialAlert, type AlertState } from '@/data/notifications';
import { NAVIGATION_ITEMS, type PageId } from './navigation';

interface NotificationAlertItemProps {
  alert: FinancialAlert;
  state?: AlertState;
  onDismiss: (key: string) => void;
  onMarkRead?: (key: string) => void;
  onClose?: () => void;
}

export function NotificationAlertItem({ alert, state, onDismiss, onMarkRead, onClose }: NotificationAlertItemProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const isUnread = !state?.readAt;

  function getAlertIcon() {
    switch (alert.kind) {
      case 'budget-streak':
        return <Flame className="size-4 shrink-0 text-theme-orange" />;
      case 'spending-spike':
      case 'budget-threshold':
        return alert.severity === 'critical' ? (
          <AlertTriangle className="size-4 shrink-0 text-theme-red" />
        ) : (
          <AlertTriangle className="size-4 shrink-0 text-theme-orange" />
        );
      case 'upcoming-bill':
        return <Clock className="size-4 shrink-0 text-theme-cyan" />;
      case 'savings-milestone':
        return <Sparkles className="size-4 shrink-0 text-theme-green" />;
      case 'deficit':
        return <TrendingDown className="size-4 shrink-0 text-theme-red" />;
      case 'system':
        return <ShieldAlert className="size-4 shrink-0 text-theme-orange" />;
      default:
        return <Info className="size-4 shrink-0 text-theme-cyan" />;
    }
  }

  function getSeverityClasses() {
    switch (alert.severity) {
      case 'critical':
        return 'border-theme-red/40 bg-theme-red/5 hover:border-theme-red/60';
      case 'warning':
        return 'border-theme-orange/40 bg-theme-orange/5 hover:border-theme-orange/60';
      case 'success':
        return 'border-theme-green/40 bg-theme-green/5 hover:border-theme-green/60';
      case 'info':
      default:
        return 'border-theme-cyan/40 bg-theme-cyan/5 hover:border-theme-cyan/60';
    }
  }

  function getPageLabel(page: string): string {
    const navItem = NAVIGATION_ITEMS.find(i => i.id === (page as PageId));
    return navItem ? t(navItem.key) : page;
  }

  function handleNavigate(page: string) {
    onMarkRead?.(alert.key);
    if (onClose) onClose();
    void navigate(`/${page}`);
  }

  const title = t(alert.titleKey as TranslationKey, alert.params);
  const description = t(alert.descriptionKey as TranslationKey, alert.params);

  return (
    <div
      className={`relative p-3 rounded-xl border backdrop-blur-md transition-all flex items-start justify-between gap-3 ${getSeverityClasses()}`}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <div className="mt-0.5 p-1 rounded-md bg-foreground/5 relative">
          {getAlertIcon()}
          {isUnread && (
            <span className="absolute -top-1 -right-1 size-2 rounded-full bg-theme-cyan shadow-[0_0_8px_var(--shadow-glow-cyan)]" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-foreground truncate">{title}</p>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{description}</p>

          {alert.actionPage && (
            <button
              type="button"
              onClick={() => handleNavigate(alert.actionPage!)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-theme-cyan hover:underline mt-1.5 cursor-pointer"
            >
              <span>
                {t('notifications.reviewIn', {
                  page: getPageLabel(alert.actionPage),
                })}
              </span>
              <ArrowRight className="size-2.5" />
            </button>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDismiss(alert.key)}
        className="size-6 p-0 shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={t('notifications.dismiss')}
      >
        <X className="size-3" />
      </Button>
    </div>
  );
}
