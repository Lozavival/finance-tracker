import { useMemo, useEffect } from 'react';
import { useFinance } from './FinanceContext';
import { useSettings } from './SettingsContext';
import { useNotifications } from './NotificationsContext';
import { useI18n } from '@/i18n';
import { calculateMonthlyBudget } from '@/data/goals';
import { generateSmartFinancialSignals } from '@/data/analytics';
import { type FinancialAlert, buildFinancialAlerts, formatSignalParams } from '@/data/notifications';

export function useFinancialAlerts() {
  const finance = useFinance();
  const { settings } = useSettings();
  const { preferences, alertState, observeAlerts } = useNotifications();
  const { formatCents, currency } = useI18n();

  const today = finance.today;

  // 1. Generate smart heuristic signals
  const rawSignals = useMemo(() => {
    return generateSmartFinancialSignals(
      finance.transactions,
      settings,
      settings.goals,
      finance.statements,
      finance.recurringRules,
      finance.ledgers,
      today,
      currency,
    );
  }, [finance.transactions, settings, finance.statements, finance.recurringRules, finance.ledgers, today, currency]);

  // 2. Calculate current month budget summary
  const budgetSummary = useMemo(() => {
    return calculateMonthlyBudget(
      finance.transactions,
      settings.goals,
      today,
      currency,
      settings.exchangeRate?.rate ?? null,
    );
  }, [finance.transactions, settings.goals, today, currency, settings.exchangeRate?.rate]);

  // 3. Build unified financial alerts from signals + budget thresholds
  const allAlerts = useMemo(() => {
    const list = buildFinancialAlerts({
      signals: rawSignals,
      budget: budgetSummary,
      prefs: preferences,
      today,
    });

    // If offline, append system alert if not dismissed
    if (finance.syncStatus === 'offline') {
      const offlineAlert: FinancialAlert = {
        key: 'system-offline',
        kind: 'system',
        severity: 'warning',
        titleKey: 'notifications.system.offlineTitle',
        descriptionKey: 'notifications.system.offlineDesc',
        params: {},
      };
      list.unshift(offlineAlert);
    }

    // Format currency parameters
    return list.map(alert => ({
      ...alert,
      params: formatSignalParams(alert, formatCents),
    }));
  }, [rawSignals, budgetSummary, preferences, today, finance.syncStatus, formatCents]);

  // 4. Filter out globally dismissed alerts
  const activeAlerts = useMemo(() => {
    return allAlerts.filter(a => !alertState[a.key]?.dismissedAt);
  }, [allAlerts, alertState]);

  // 5. Track firstSeenAt for active alerts
  useEffect(() => {
    if (activeAlerts.length > 0) {
      observeAlerts(activeAlerts.map(a => a.key));
    }
  }, [activeAlerts, observeAlerts]);

  // 6. Compute unread counts and severity flags
  const unreadCount = useMemo(() => {
    return activeAlerts.filter(a => !alertState[a.key]?.readAt).length;
  }, [activeAlerts, alertState]);

  const hasCritical = useMemo(() => {
    return activeAlerts.some(a => a.severity === 'critical');
  }, [activeAlerts]);

  return {
    alerts: activeAlerts,
    unreadCount,
    hasCritical,
  };
}
