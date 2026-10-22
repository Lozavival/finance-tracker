import { Sparkles, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/i18n';
import { type FinancialAlert } from '@/data/notifications';
import { NotificationAlertItem } from '@/layout/NotificationAlertItem';
import { useNotifications } from '@/state/NotificationsContext';

interface SmartInsightsContentProps {
  alerts: FinancialAlert[];
  onDismiss: (key: string) => void;
  onClose?: () => void;
}

export function SmartInsightsContent({ alerts, onDismiss, onClose }: SmartInsightsContentProps) {
  const { t } = useI18n();
  const { alertState, markAlertsRead } = useNotifications();

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-theme-orange/15 text-theme-orange">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">{t('dashboard.financialSignals')}</h3>
            <p className="text-[11px] text-muted-foreground">{t('dashboard.smartInsightsSubtitle')}</p>
          </div>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-foreground/10 text-foreground font-semibold">
          {alerts.length}
        </span>
      </div>

      {/* Signals List or Empty State */}
      {alerts.length > 0 ? (
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
          {alerts.map(alert => (
            <NotificationAlertItem
              key={alert.key}
              alert={alert}
              state={alertState[alert.key]}
              onDismiss={onDismiss}
              onMarkRead={key => markAlertsRead([key])}
              onClose={onClose}
            />
          ))}
        </div>
      ) : (
        <div className="py-8 px-4 flex flex-col items-center justify-center text-center">
          <div className="p-2.5 rounded-full bg-theme-green/15 text-theme-green mb-2.5">
            <CheckCircle2 className="size-6" />
          </div>
          <p className="text-xs font-semibold text-foreground">{t('dashboard.noSignalsTitle')}</p>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">{t('dashboard.noSignalsDesc')}</p>
        </div>
      )}
    </div>
  );
}
