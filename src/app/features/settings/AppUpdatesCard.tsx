import { Download, RefreshCw, ExternalLink, ShieldCheck, FlaskConical } from 'lucide-react';
import { Card } from '@/components/primitives/card';
import { Button } from '@/components/primitives/button';
import { Toggle } from '@/components/primitives/toggle';
import { InlineAlert } from '@/components/shared/InlineAlert';
import { useI18n } from '@/i18n';
import { useAppUpdates } from '@/state/AppUpdatesContext';

export function AppUpdatesCard() {
  const { t } = useI18n();
  const {
    currentVersion,
    includePrereleases,
    setIncludePrereleases,
    isChecking,
    lastCheckedAt,
    latestRelease,
    updateAvailable,
    error,
    checkForUpdates,
  } = useAppUpdates();

  if (typeof window === 'undefined' || !window.electronAPI?.isElectron) {
    return null;
  }

  const channelOptions = [
    {
      id: 'stable',
      includePrereleases: false,
      label: t('settings.updates.channelStable'),
      desc: t('settings.updates.channelStableDesc'),
      icon: ShieldCheck,
    },
    {
      id: 'prerelease',
      includePrereleases: true,
      label: t('settings.updates.channelPrerelease'),
      desc: t('settings.updates.channelPrereleaseDesc'),
      icon: FlaskConical,
    },
  ] as const;

  return (
    <Card className="@container min-w-0 p-4 sm:p-6 bg-foreground/5 backdrop-blur-xl border border-border @5xl/main:col-span-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-theme-cyan/15 text-theme-cyan shrink-0">
            <Download className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-medium text-foreground truncate">{t('settings.updates.title')}</div>
            <div className="text-xs text-muted-foreground">{t('settings.updates.desc')}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void checkForUpdates({ silent: false })}
            disabled={isChecking}
            className="gap-2 border-border text-foreground hover:bg-foreground/5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? t('settings.updates.checkingButton') : t('settings.updates.checkButton')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 @md:grid-cols-2 gap-6 mt-4 pt-4 border-t border-border/40">
        {/* Left column: Current Version & Update Check Status */}
        <div className="space-y-3 min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('common.status')}
          </div>
          <div className="p-4 rounded-lg bg-foreground/5 border border-border space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground tabular-nums">
                {t('settings.updates.currentVersion', { version: currentVersion })}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium tabular-nums ${
                  error
                    ? 'bg-destructive/15 text-destructive border border-destructive/30'
                    : updateAvailable && latestRelease
                      ? 'bg-theme-cyan/15 text-theme-cyan border border-theme-cyan/30'
                      : lastCheckedAt
                        ? 'bg-theme-green/15 text-theme-green border border-theme-green/30'
                        : 'bg-foreground/10 text-muted-foreground border border-border'
                }`}
              >
                {error
                  ? t('settings.updates.statusError')
                  : updateAvailable && latestRelease
                    ? t('settings.updates.statusAvailable', { version: latestRelease.version })
                    : lastCheckedAt
                      ? t('settings.updates.statusUpToDate')
                      : t('settings.updates.statusNotChecked')}
              </span>
            </div>

            {lastCheckedAt && (
              <div className="text-xs text-muted-foreground tabular-nums">
                {t('settings.updates.lastChecked', {
                  time: new Date(lastCheckedAt).toLocaleString(),
                })}
              </div>
            )}

            {updateAvailable && latestRelease && (
              <div className="p-3 rounded-lg bg-theme-cyan/10 border border-theme-cyan/30 space-y-2 mt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-theme-cyan tabular-nums">
                    {t('settings.updates.updateAvailableTitle', { version: latestRelease.version })}
                  </span>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                      latestRelease.prerelease
                        ? 'bg-theme-orange/15 text-theme-orange border border-theme-orange/30'
                        : 'bg-theme-green/15 text-theme-green border border-theme-green/30'
                    }`}
                  >
                    {latestRelease.prerelease
                      ? t('settings.updates.prereleaseBadge')
                      : t('settings.updates.stableBadge')}
                  </span>
                </div>

                <div>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto gap-1.5 border-theme-cyan/40 bg-theme-cyan/15 text-theme-cyan hover:bg-theme-cyan/25 hover:text-theme-cyan text-xs h-8"
                  >
                    <a href={latestRelease.htmlUrl} target="_blank" rel="noopener noreferrer">
                      <span>{t('settings.updates.downloadRelease', { version: latestRelease.version })}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {!updateAvailable && lastCheckedAt && !error && (
              <div className="text-xs text-theme-green tabular-nums">
                {t('settings.updates.upToDateDesc', { version: currentVersion })}
              </div>
            )}

            {error && (
              <InlineAlert variant="destructive" className="mt-2">
                {error}
              </InlineAlert>
            )}
          </div>
        </div>

        {/* Right column: Update Channel Selection */}
        <div className="space-y-3 min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('settings.updates.channelLabel')}
          </div>
          <div className="space-y-2">
            {channelOptions.map(opt => {
              const isSelected = includePrereleases === opt.includePrereleases;
              const Icon = opt.icon;
              return (
                <Toggle
                  key={opt.id}
                  pressed={isSelected}
                  onPressedChange={() => setIncludePrereleases(opt.includePrereleases)}
                  variant="outline"
                  aria-label={opt.label}
                  className={`w-full flex items-center justify-between gap-3 p-3 h-auto rounded-lg border text-sm transition-all duration-200 cursor-pointer overflow-hidden ${
                    isSelected
                      ? 'border-theme-cyan/60 bg-theme-cyan/10 text-theme-cyan data-[state=on]:bg-theme-cyan/10 data-[state=on]:text-theme-cyan'
                      : 'border-border bg-foreground/5 text-foreground hover:border-theme-cyan/40 hover:text-foreground'
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
        </div>
      </div>
    </Card>
  );
}
