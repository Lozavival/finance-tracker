import { useNavigate } from 'react-router-dom';
import { Flame, AlertTriangle, TrendingDown, Clock, Sparkles, ArrowRight, X, Info, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/primitives/button';
import { useI18n, type TranslationKey } from '@/i18n';
import { type SmartFinancialSignal } from '@/data/analytics';

interface SmartInsightsContentProps {
  signals: SmartFinancialSignal[];
  onDismiss: (id: string) => void;
  onClose?: () => void;
}

export function SmartInsightsContent({ signals, onDismiss, onClose }: SmartInsightsContentProps) {
  const { t } = useI18n();
  const navigate = useNavigate();

  function getSignalIcon(signal: SmartFinancialSignal) {
    switch (signal.type) {
      case 'streak':
        return <Flame className="size-4 shrink-0 text-theme-orange" />;
      case 'spike':
        return <AlertTriangle className="size-4 shrink-0 text-theme-orange" />;
      case 'upcoming-bill':
        return <Clock className="size-4 shrink-0 text-theme-cyan" />;
      case 'savings-milestone':
        return <Sparkles className="size-4 shrink-0 text-theme-green" />;
      case 'deficit-warning':
        return <TrendingDown className="size-4 shrink-0 text-theme-red" />;
      default:
        return <Info className="size-4 shrink-0 text-theme-blue" />;
    }
  }

  function getSeverityClasses(severity: SmartFinancialSignal['severity']) {
    switch (severity) {
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
    if (page === 'goals') return t('nav.goals');
    if (page === 'transactions') return t('nav.transactions');
    if (page === 'accounts') return t('nav.accounts');
    return page;
  }

  function handleNavigate(page: string) {
    if (onClose) onClose();
    void navigate(`/${page}`);
  }

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
          {signals.length}
        </span>
      </div>

      {/* Signals List or Empty State */}
      {signals.length > 0 ? (
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
          {signals.map(signal => {
            const title = t(signal.titleKey as TranslationKey);
            const description = t(signal.descriptionKey as TranslationKey, signal.params);

            return (
              <div
                key={signal.id}
                className={`p-3 rounded-xl border backdrop-blur-md transition-all flex items-start justify-between gap-3 ${getSeverityClasses(
                  signal.severity,
                )}`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="mt-0.5 p-1 rounded-md bg-foreground/5">{getSignalIcon(signal)}</div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{description}</p>

                    {signal.actionPage && (
                      <button
                        type="button"
                        onClick={() => handleNavigate(signal.actionPage!)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-theme-cyan hover:underline mt-1.5 cursor-pointer"
                      >
                        <span>
                          {t('dashboard.signals.reviewAction', {
                            page: getPageLabel(signal.actionPage),
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
                  onClick={() => onDismiss(signal.id)}
                  className="size-6 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label={t('dashboard.signals.dismiss')}
                >
                  <X className="size-3" />
                </Button>
              </div>
            );
          })}
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
