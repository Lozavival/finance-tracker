import { Bell, Flame, AlertTriangle, Clock, TrendingDown, Sparkles, Sliders, Trash2 } from 'lucide-react';
import { Card } from '@/components/primitives/card';
import { Button } from '@/components/primitives/button';
import { Switch } from '@/components/primitives/switch';
import { Slider } from '@/components/primitives/slider';
import { Input } from '@/components/primitives/input';
import { useI18n, type TranslationKey } from '@/i18n';
import { useNotifications } from '@/state/NotificationsContext';
import { type AlertKind, MIN_BUDGET_WARNING_PERCENT, MAX_BUDGET_WARNING_PERCENT } from '@/data/notifications';

export function NotificationsPanel() {
  const { t } = useI18n();
  const { preferences, updatePreferences, clearActivity, notify } = useNotifications();

  const alertKindsList: {
    kind: Exclude<AlertKind, 'system'>;
    icon: typeof Bell;
    colorClass: string;
  }[] = [
    { kind: 'budget-threshold', icon: Sliders, colorClass: 'text-theme-cyan' },
    { kind: 'budget-streak', icon: Flame, colorClass: 'text-theme-orange' },
    { kind: 'spending-spike', icon: AlertTriangle, colorClass: 'text-theme-orange' },
    { kind: 'upcoming-bill', icon: Clock, colorClass: 'text-theme-cyan' },
    { kind: 'deficit', icon: TrendingDown, colorClass: 'text-theme-red' },
    { kind: 'savings-milestone', icon: Sparkles, colorClass: 'text-theme-green' },
  ];

  function handleThresholdChange(val: number) {
    const clamped = Math.max(MIN_BUDGET_WARNING_PERCENT, Math.min(MAX_BUDGET_WARNING_PERCENT, val));
    updatePreferences({ budgetWarningPercent: clamped });
  }

  function handleClearHistory() {
    clearActivity();
    notify.info('notifications.preferences.clearHistoryConfirm', { id: 'history-cleared' });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* 1. Operation Confirmations */}
      <Card className="p-6 bg-foreground/5 backdrop-blur-xl border border-border">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-base font-medium text-foreground">{t('notifications.preferences.successToasts')}</div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              {t('notifications.preferences.successToastsDesc')}
            </div>
          </div>
          <Switch
            checked={preferences.successToasts}
            onCheckedChange={checked => updatePreferences({ successToasts: checked })}
          />
        </div>
      </Card>

      {/* 2. Automated Financial Alerts & Thresholds */}
      <Card className="p-6 bg-foreground/5 backdrop-blur-xl border border-border space-y-5">
        <div>
          <div className="text-base font-medium text-foreground">{t('notifications.preferences.alertKinds')}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{t('notifications.preferences.alertKindsDesc')}</div>
        </div>

        <div className="space-y-3 pt-2">
          {alertKindsList.map(({ kind, icon: Icon, colorClass }) => {
            const isEnabled = preferences.alertKinds[kind];
            const isThreshold = kind === 'budget-threshold';

            return (
              <div key={kind} className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-foreground/5 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-foreground/5">
                      <Icon className={`size-4 ${colorClass}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">
                        {t(`notifications.preferences.kinds.${kind}` as TranslationKey)}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={checked =>
                      updatePreferences({
                        alertKinds: {
                          ...preferences.alertKinds,
                          [kind]: checked,
                        },
                      })
                    }
                  />
                </div>

                {/* Sub-slider for budget warning threshold */}
                {isThreshold && isEnabled && (
                  <div className="ml-4 pl-4 border-l-2 border-theme-cyan/30 py-2 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          {t('notifications.preferences.budgetWarningThreshold')}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {t('notifications.preferences.budgetWarningThresholdDesc')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Input
                          type="number"
                          min={MIN_BUDGET_WARNING_PERCENT}
                          max={MAX_BUDGET_WARNING_PERCENT}
                          value={preferences.budgetWarningPercent}
                          onChange={e => handleThresholdChange(Number(e.target.value) || MIN_BUDGET_WARNING_PERCENT)}
                          className="w-16 h-8 text-xs text-right font-mono"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                    <div className="pt-1">
                      <Slider
                        value={[preferences.budgetWarningPercent]}
                        min={MIN_BUDGET_WARNING_PERCENT}
                        max={MAX_BUDGET_WARNING_PERCENT}
                        step={5}
                        onValueChange={vals => handleThresholdChange(vals[0])}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* 3. Activity History Management */}
      <Card className="p-6 bg-foreground/5 backdrop-blur-xl border border-border">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-base font-medium text-foreground">{t('notifications.preferences.clearHistory')}</div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              {t('notifications.preferences.clearHistoryDesc')}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearHistory}
            className="border-destructive/40 text-destructive hover:bg-destructive/10 shrink-0 gap-1.5"
          >
            <Trash2 className="size-3.5" />
            <span>{t('notifications.clear')}</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
