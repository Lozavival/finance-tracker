import { Card } from '../ui/card';
import { useI18n } from '../../i18n';
import { Globe, DollarSign, Sparkles } from 'lucide-react';
import { type SupportedLocale, type SupportedCurrency } from '../../i18n/types';

export function PreferencesPanel() {
  const {
    t,
    locale,
    setLocale,
    currency,
    setCurrency,
    supportedLocales,
    supportedCurrencies,
    formatCurrency,
    formatShort,
    formatFull,
    formatNumber,
  } = useI18n();

  const previewDate = new Date();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Language Selection Card */}
        <Card className="p-6 bg-foreground/5 backdrop-blur-xl border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-theme-cyan">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-medium text-foreground">{t('settings.languageLabel')}</div>
              <div className="text-xs text-muted-foreground">{t('settings.languageDesc')}</div>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            {supportedLocales.map(loc => {
              const isSelected = locale === loc.code;
              return (
                <button
                  key={loc.code}
                  type="button"
                  onClick={() => setLocale(loc.code as SupportedLocale)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border text-sm transition-all duration-200 ${
                    isSelected
                      ? 'border-cyan-400/60 bg-cyan-500/10 text-theme-cyan shadow-sm shadow-cyan-500/10'
                      : 'border-border bg-foreground/5 text-foreground hover:border-cyan-400/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {loc.flag && <span className="text-base">{loc.flag}</span>}
                    <div className="text-left">
                      <div className="font-medium">{loc.nativeLabel}</div>
                      <div className="text-xs text-muted-foreground">{loc.label}</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-theme-cyan bg-theme-cyan' : 'border-muted-foreground'
                      }`}
                    >
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-background" />}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Currency Selection Card */}
        <Card className="p-6 bg-foreground/5 backdrop-blur-xl border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-theme-green">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-medium text-foreground">{t('settings.currencyLabel')}</div>
              <div className="text-xs text-muted-foreground">{t('settings.currencyDesc')}</div>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            {supportedCurrencies.map(curr => {
              const isSelected = currency === curr.code;
              return (
                <button
                  key={curr.code}
                  type="button"
                  onClick={() => setCurrency(curr.code as SupportedCurrency)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border text-sm transition-all duration-200 ${
                    isSelected
                      ? 'border-emerald-400/60 bg-emerald-500/10 text-theme-green shadow-sm shadow-emerald-500/10'
                      : 'border-border bg-foreground/5 text-foreground hover:border-emerald-400/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded bg-foreground/10 flex items-center justify-center font-bold text-xs text-foreground">
                      {curr.symbol}
                    </span>
                    <span className="font-medium">{curr.label}</span>
                  </div>
                  <div className="flex items-center">
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-theme-green bg-theme-green' : 'border-muted-foreground'
                      }`}
                    >
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-background" />}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Live Preview Card */}
      <Card className="p-6 bg-foreground/5 backdrop-blur-xl border border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-violet-500/20 text-theme-violet">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-medium text-foreground">{t('settings.previewTitle')}</div>
            <div className="text-xs text-muted-foreground">{t('settings.previewDesc')}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="p-4 rounded-lg bg-foreground/5 border border-border">
            <div className="text-xs text-muted-foreground mb-1">{t('settings.previewCurrency')}</div>
            <div className="text-xl font-bold text-theme-cyan tracking-tight">{formatCurrency(124592.5)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {currency} · {t('settings.active')}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-foreground/5 border border-border">
            <div className="text-xs text-muted-foreground mb-1">{t('settings.previewDateShort')}</div>
            <div className="text-xl font-bold text-foreground tracking-tight">{formatShort(previewDate)}</div>
            <div className="text-xs text-muted-foreground mt-1">{t('settings.shortRepresentation')}</div>
          </div>

          <div className="p-4 rounded-lg bg-foreground/5 border border-border">
            <div className="text-xs text-muted-foreground mb-1">{t('settings.previewDateLong')}</div>
            <div className="text-xl font-bold text-foreground tracking-tight">{formatFull(previewDate)}</div>
            <div className="text-xs text-muted-foreground mt-1">{t('settings.fullRepresentation')}</div>
          </div>

          <div className="p-4 rounded-lg bg-foreground/5 border border-border">
            <div className="text-xs text-muted-foreground mb-1">{t('settings.numberFormat')}</div>
            <div className="text-xl font-bold text-foreground tracking-tight">{formatNumber(1234567.89)}</div>
            <div className="text-xs text-muted-foreground mt-1">{t('settings.localeDelimiters')}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
