import { useState, useEffect } from 'react';
import { Card } from '@/components/primitives/card';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { Toggle } from '@/components/primitives/toggle';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/primitives/alert-dialog';
import { InlineAlert } from '@/components/shared/InlineAlert';
import { useI18n } from '@/i18n';
import { useSettings } from '@/state/SettingsContext';
import { useNotifications } from '@/state/NotificationsContext';
import { useFinance } from '@/state/FinanceContext';
import {
  Globe,
  DollarSign,
  Sparkles,
  ArrowLeftRight,
  RefreshCw,
  Check,
  X,
  SunMoon,
  Monitor,
  Sun,
  Moon,
  RotateCcw,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { type SupportedLocale, type SupportedCurrency } from '@/i18n/types';
import { fetchLiveExchangeRate, getExchangeRateErrorDetails } from '@/data/currency';
import { logger } from '@/lib/logger';
import { AppUpdatesCard } from './AppUpdatesCard';

const prefsLogger = logger.child('PreferencesPanel');

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

  const { settings, dispatch } = useSettings();
  const { notify } = useNotifications();
  const { resetWorkspace } = useFinance();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [resetMode, setResetMode] = useState<'development' | 'production' | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? (theme ?? 'system') : 'system';
  const themeOptions = [
    {
      id: 'system',
      label: t('settings.themeSystem'),
      desc:
        mounted && currentTheme === 'system'
          ? t('settings.themeActiveSystem', {
              mode: resolvedTheme === 'dark' ? t('settings.themeDark') : t('settings.themeLight'),
            })
          : t('settings.themeSystemDesc'),
      icon: Monitor,
    },
    {
      id: 'light',
      label: t('settings.themeLight'),
      desc: t('settings.themeLightDesc'),
      icon: Sun,
    },
    {
      id: 'dark',
      label: t('settings.themeDark'),
      desc: t('settings.themeDarkDesc'),
      icon: Moon,
    },
  ] as const;

  const [manualRateInput, setManualRateInput] = useState(
    settings.exchangeRate?.rate ? String(settings.exchangeRate.rate) : '',
  );
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchSuccess, setFetchSuccess] = useState<string | null>(null);

  const previewDate = new Date();

  async function handleFetchLiveRate() {
    setIsFetchingRate(true);
    setFetchError(null);
    setFetchSuccess(null);
    try {
      const result = await fetchLiveExchangeRate();
      if (result && result.rate) {
        prefsLogger.info('Live exchange rate fetched successfully', { rate: result.rate });
        const nowIso = result.timestamp || new Date().toISOString();
        void dispatch({
          type: 'settings/updateExchangeRate',
          payload: {
            rate: result.rate,
            lastUpdated: nowIso,
            source: 'api',
            error: null,
            isLoading: false,
          },
        });
        setManualRateInput(String(result.rate));
        const formattedTime = new Date().toLocaleTimeString();
        const successMsg = t('settings.rateUpdated', {
          rate: result.rate.toFixed(4),
          time: formattedTime,
        });
        setFetchSuccess(successMsg);
        notify.success('settings.rateUpdated', {
          id: 'rate-fetch-status',
          params: {
            rate: result.rate.toFixed(4),
            time: formattedTime,
          },
        });
      } else {
        throw new Error('Service unavailable');
      }
    } catch (err) {
      const { key, params } = getExchangeRateErrorDetails(err);
      const errorMsg = t(key, params);

      setFetchError(errorMsg);
      setFetchSuccess(null);
      void dispatch({
        type: 'settings/updateExchangeRate',
        payload: {
          error: errorMsg,
          isLoading: false,
        },
      });
      notify.error(key, {
        id: 'rate-fetch-status',
        params,
      });
    } finally {
      setIsFetchingRate(false);
    }
  }

  function handleSaveManualRate() {
    const parsed = Number(manualRateInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      prefsLogger.warn('Invalid manual rate input rejected', { input: manualRateInput });
      notify.validation('settings.invalidRate', { id: 'manual-rate-validation' });
      return;
    }
    prefsLogger.info('Manual exchange rate saved', { rate: parsed });
    const savePromise = dispatch({
      type: 'settings/updateExchangeRate',
      payload: {
        rate: parsed,
        lastUpdated: new Date().toISOString(),
        source: 'manual',
        error: null,
      },
    });
    const formattedTime = new Date().toLocaleTimeString();
    setFetchSuccess(
      t('settings.rateUpdated', {
        rate: parsed.toFixed(4),
        time: formattedTime,
      }),
    );
    setFetchError(null);
    notify.successWhen(savePromise, 'settings.rateUpdated', {
      id: 'rate-fetch-status',
      params: {
        rate: parsed.toFixed(4),
        time: formattedTime,
      },
    });
  }

  function handleClearRate() {
    prefsLogger.info('Manual exchange rate cleared');
    void dispatch({
      type: 'settings/updateExchangeRate',
      payload: {
        rate: null,
        lastUpdated: null,
        source: 'none',
        error: null,
      },
    });
    setManualRateInput('');
    setFetchSuccess(null);
    setFetchError(null);
  }

  async function handleConfirmReset() {
    if (!resetMode) return;
    try {
      const p = resetWorkspace(resetMode);
      notify.successWhen(
        p.then(() => true),
        'settings.resetSuccess',
        { id: 'workspace-reset' },
      );
      await p;
    } catch (err) {
      prefsLogger.error('Failed to reset workspace:', err);
    } finally {
      setResetMode(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 @5xl/main:grid-cols-3 gap-6">
        {/* Appearance / Theme Selection Card */}
        <Card className="@container min-w-0 p-4 sm:p-6 bg-foreground/5 backdrop-blur-xl border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-theme-purple/15 text-theme-purple shrink-0">
              <SunMoon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-lg font-medium text-foreground truncate">{t('settings.themeLabel')}</div>
              <div className="text-xs text-muted-foreground truncate">{t('settings.themeDesc')}</div>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            {themeOptions.map(opt => {
              const isSelected = currentTheme === opt.id;
              const Icon = opt.icon;
              return (
                <Toggle
                  key={opt.id}
                  pressed={isSelected}
                  onPressedChange={() => setTheme(opt.id)}
                  variant="outline"
                  aria-label={opt.label}
                  className={`w-full flex items-center justify-between gap-3 p-3 h-auto rounded-lg border text-sm transition-all duration-200 cursor-pointer overflow-hidden ${
                    isSelected
                      ? 'border-theme-purple/60 bg-theme-purple/10 text-theme-purple data-[state=on]:bg-theme-purple/10 data-[state=on]:text-theme-purple'
                      : 'border-border bg-foreground/5 text-foreground hover:border-theme-purple/40 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="w-7 h-7 rounded bg-foreground/10 flex items-center justify-center text-foreground shrink-0">
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="text-left min-w-0 flex-1">
                      <div className="font-medium text-foreground truncate">{opt.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{opt.desc}</div>
                    </div>
                  </div>
                  <div className="flex items-center shrink-0">
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-theme-purple bg-theme-purple' : 'border-muted-foreground'
                      }`}
                    >
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-background" />}
                    </span>
                  </div>
                </Toggle>
              );
            })}
          </div>
        </Card>

        {/* Language Selection Card */}
        <Card className="@container min-w-0 p-4 sm:p-6 bg-foreground/5 backdrop-blur-xl border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-theme-cyan/15 text-theme-cyan shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-lg font-medium text-foreground truncate">{t('settings.languageLabel')}</div>
              <div className="text-xs text-muted-foreground truncate">{t('settings.languageDesc')}</div>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            {supportedLocales.map(loc => {
              const isSelected = locale === loc.code;
              return (
                <Toggle
                  key={loc.code}
                  pressed={isSelected}
                  onPressedChange={() => setLocale(loc.code as SupportedLocale)}
                  variant="outline"
                  aria-label={loc.label}
                  className={`w-full flex items-center justify-between gap-3 p-3 h-auto rounded-lg border text-sm transition-all duration-200 cursor-pointer overflow-hidden ${
                    isSelected
                      ? 'border-theme-cyan/60 bg-theme-cyan/10 text-theme-cyan data-[state=on]:bg-theme-cyan/10 data-[state=on]:text-theme-cyan'
                      : 'border-border bg-foreground/5 text-foreground hover:border-theme-cyan/40 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {loc.flag && <span className="text-base shrink-0">{loc.flag}</span>}
                    <div className="text-left min-w-0 flex-1">
                      <div className="font-medium truncate">{loc.nativeLabel}</div>
                      <div className="text-xs text-muted-foreground truncate">{loc.label}</div>
                    </div>
                  </div>
                  <div className="flex items-center shrink-0">
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-theme-cyan bg-theme-cyan' : 'border-muted-foreground'
                      }`}
                    >
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-background" />}
                    </span>
                  </div>
                </Toggle>
              );
            })}
          </div>
        </Card>

        {/* Currency Selection Card */}
        <Card className="@container min-w-0 p-4 sm:p-6 bg-foreground/5 backdrop-blur-xl border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-theme-green/15 text-theme-green shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-lg font-medium text-foreground truncate">{t('settings.currencyLabel')}</div>
              <div className="text-xs text-muted-foreground truncate">{t('settings.currencyDesc')}</div>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            {supportedCurrencies.map(curr => {
              const isSelected = currency === curr.code;
              return (
                <Toggle
                  key={curr.code}
                  pressed={isSelected}
                  onPressedChange={() => setCurrency(curr.code as SupportedCurrency)}
                  variant="outline"
                  aria-label={curr.label}
                  className={`w-full flex items-center justify-between gap-3 p-3 h-auto rounded-lg border text-sm transition-all duration-200 cursor-pointer overflow-hidden ${
                    isSelected
                      ? 'border-theme-green/60 bg-theme-green/10 text-theme-green data-[state=on]:bg-theme-green/10 data-[state=on]:text-theme-green'
                      : 'border-border bg-foreground/5 text-foreground hover:border-theme-green/40 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="w-7 h-7 rounded bg-foreground/10 flex items-center justify-center font-bold text-xs text-foreground shrink-0">
                      {curr.symbol}
                    </span>
                    <span className="font-medium truncate">{curr.label}</span>
                  </div>
                  <div className="flex items-center shrink-0">
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-theme-green bg-theme-green' : 'border-muted-foreground'
                      }`}
                    >
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-background" />}
                    </span>
                  </div>
                </Toggle>
              );
            })}
          </div>
        </Card>

        {/* Exchange Rate Management Card */}
        <Card className="@container min-w-0 p-4 sm:p-6 bg-foreground/5 backdrop-blur-xl border border-border @5xl/main:col-span-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-theme-blue/15 text-theme-blue">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-medium text-foreground">{t('settings.exchangeRateTitle')}</div>
                <div className="text-xs text-muted-foreground">{t('settings.exchangeRateDesc')}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFetchLiveRate}
                disabled={isFetchingRate}
                className="gap-2 border-border text-foreground hover:bg-foreground/5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetchingRate ? 'animate-spin' : ''}`} />
                {isFetchingRate ? t('settings.fetchingRate') : t('settings.fetchLiveRate')}
              </Button>
              {settings.exchangeRate?.rate !== null && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearRate}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  {t('settings.clearRate')}
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 @md:grid-cols-2 gap-6 mt-4 pt-4 border-t border-border/40">
            {/* Current Status */}
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('common.status')}
              </div>
              <div className="p-4 rounded-lg bg-foreground/5 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {settings.exchangeRate?.rate !== null && settings.exchangeRate?.rate !== undefined
                      ? `1 USD = R$ ${settings.exchangeRate.rate.toFixed(4)}`
                      : t('settings.rateStatusNone')}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      settings.exchangeRate?.error
                        ? 'bg-destructive/15 text-destructive border border-destructive/30'
                        : settings.exchangeRate?.rate !== null && settings.exchangeRate?.rate !== undefined
                          ? 'bg-theme-cyan/15 text-theme-cyan border border-theme-cyan/30'
                          : 'bg-foreground/10 text-muted-foreground border border-border'
                    }`}
                  >
                    {settings.exchangeRate?.error
                      ? t('settings.rateStatusError')
                      : settings.exchangeRate?.rate !== null && settings.exchangeRate?.rate !== undefined
                        ? settings.exchangeRate.source === 'api'
                          ? t('settings.rateStatusLive')
                          : t('settings.rateStatusManual')
                        : t('settings.rateStatusNone')}
                  </span>
                </div>
                {settings.exchangeRate?.lastUpdated && (
                  <div className="text-xs text-muted-foreground">
                    {t('common.date')}: {new Date(settings.exchangeRate.lastUpdated).toLocaleString()}
                  </div>
                )}
                {fetchSuccess && <div className="text-xs text-theme-green">{fetchSuccess}</div>}
                {(fetchError || settings.exchangeRate?.error) && (
                  <InlineAlert variant="destructive" className="mt-2">
                    {fetchError || settings.exchangeRate?.error}
                  </InlineAlert>
                )}
              </div>
            </div>

            {/* Manual Override */}
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('settings.manualRate')}
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  value={manualRateInput}
                  onChange={e => setManualRateInput(e.target.value)}
                  placeholder="5.2500"
                  className="h-10 border-border bg-foreground/5 text-foreground placeholder:text-muted-foreground"
                />
                <Button
                  type="button"
                  variant="cyan"
                  onClick={handleSaveManualRate}
                  disabled={!manualRateInput || Number(manualRateInput) <= 0}
                  className="h-10 shrink-0"
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  {t('common.save')}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Application Updates Card */}
        <AppUpdatesCard />
      </div>

      {/* Live Preview Card */}
      <Card className="p-6 bg-foreground/5 backdrop-blur-xl border border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-theme-purple/15 text-theme-purple">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-medium text-foreground">{t('settings.previewTitle')}</div>
            <div className="text-xs text-muted-foreground">{t('settings.previewDesc')}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 @4xl/main:grid-cols-4 gap-4 mt-4">
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

      {/* Danger Zone: Workspace Data Reset (Development & Test Environments Only) */}
      {import.meta.env.DEV && (
        <>
          <Card className="p-6 bg-foreground/5 backdrop-blur-xl border border-destructive/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-destructive/15 text-destructive">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-medium text-foreground">{t('settings.resetWorkspaceTitle')}</div>
                <div className="text-xs text-muted-foreground">{t('settings.resetWorkspaceDesc')}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetMode('development')}
                className="border-destructive/40 text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {t('settings.resetDevButton')}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setResetMode('production')}
                className="border-border hover:bg-foreground/10 text-muted-foreground cursor-pointer"
              >
                {t('settings.resetProdButton')}
              </Button>
            </div>
          </Card>

          <AlertDialog open={Boolean(resetMode)} onOpenChange={open => !open && setResetMode(null)}>
            <AlertDialogContent className="bg-popover border-border text-foreground sm:max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>{t('settings.resetDialogTitle')}</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  {t('settings.resetDialogDesc')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => setResetMode(null)}
                  className="border-border bg-foreground/5 text-foreground hover:bg-foreground/10"
                >
                  {t('common.cancel')}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmReset}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t('settings.resetConfirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
