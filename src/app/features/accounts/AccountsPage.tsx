import { useNavigate } from 'react-router-dom';
import { type CardStatement } from '@/data/cardStatements';
import { type AccountLedger, getAccountForecast } from '@/data/ledger';
import { UpcomingList } from './UpcomingList';
import { CardBillSummary } from './CardBillSummary';
import { Card } from '@/components/primitives/card';
import { Button } from '@/components/primitives/button';
import { Badge } from '@/components/primitives/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { useState, useMemo } from 'react';
import { ChevronRight, Plus, MoreVertical, Pencil, Archive, ArchiveRestore, Trash2, ChevronDown } from 'lucide-react';
import { UpcomingPeriodFilter } from '@/components/shared/filters/UpcomingPeriodFilter';
import { type Transaction } from '@/data/transactions';
import { resolveUpcomingHorizon, formatShort, type UpcomingPeriodType } from '@/data/dates';
import { useSettings } from '@/state/SettingsContext';
import { useFinance } from '@/state/FinanceContext';
import { getAccountColor, getAccountCurrencies, type AccountConfig } from '@/data/settings';
import { convertCents } from '@/data/currency';
import { type SupportedCurrency } from '@/i18n/types';
import { useNotify } from '@/state/NotificationsContext';
import { AccountFormDialog } from './AccountFormDialog';
import { DeleteAccountDialog } from './DeleteAccountDialog';
import { ArchiveAccountDialog } from './ArchiveAccountDialog';
import { RestoreAccountDialog } from './RestoreAccountDialog';
import { useI18n } from '@/i18n';

type AccountsPageProps = {
  finance?: {
    statements: CardStatement[];
    ledgers: Record<string, AccountLedger>;
    today: Date;
  };
  transactions?: Transaction[];
  onAccountSelect?: (accountId: string) => void;
};

export function AccountsPage({
  finance: propFinance,
  transactions: propTransactions,
  onAccountSelect,
}: AccountsPageProps) {
  const financeContext = useFinance();
  const navigate = useNavigate();
  const finance = propFinance ?? financeContext;
  const transactions = propTransactions ?? financeContext.transactions;
  const { settings, dispatch } = useSettings();
  const { t, formatCents, locale, currency } = useI18n();
  const notify = useNotify();
  const [upcomingPeriod, setUpcomingPeriod] = useState<UpcomingPeriodType>({ kind: 'end-of-month' });
  const [currencyFilter, setCurrencyFilter] = useState<'all' | SupportedCurrency>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountConfig | null>(null);

  const [deleteTargetAccount, setDeleteTargetAccount] = useState<AccountConfig | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [archiveTargetAccount, setArchiveTargetAccount] = useState<AccountConfig | null>(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const [restoreTargetAccount, setRestoreTargetAccount] = useState<AccountConfig | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);

  const [showArchived, setShowArchived] = useState(false);

  const horizonEnd = useMemo(() => {
    return resolveUpcomingHorizon(upcomingPeriod, finance.today);
  }, [finance.today, upcomingPeriod]);

  const activeAccounts = useMemo(() => {
    return settings.accounts.filter(a => !a.archived);
  }, [settings.accounts]);

  const filteredAccounts = useMemo(() => {
    if (currencyFilter === 'all') return activeAccounts;
    return activeAccounts.filter(acc => getAccountCurrencies(acc).includes(currencyFilter));
  }, [activeAccounts, currencyFilter]);

  const archivedAccounts = useMemo(() => {
    return settings.accounts.filter(a => a.archived);
  }, [settings.accounts]);

  const totalsByCurrency = useMemo(() => {
    const result: Record<SupportedCurrency, { balance: number; in: number; out: number; projected: number }> = {
      BRL: { balance: 0, in: 0, out: 0, projected: 0 },
      USD: { balance: 0, in: 0, out: 0, projected: 0 },
    };

    activeAccounts.forEach(acc => {
      const accCurrencies = getAccountCurrencies(acc);
      accCurrencies.forEach(curr => {
        const pocketLedger = finance.ledgers[`${acc.id}:${curr}`] ?? finance.ledgers[acc.id];
        if (pocketLedger) {
          const forecast = getAccountForecast(pocketLedger, finance.today, horizonEnd);
          result[curr].balance += forecast.current;
          result[curr].in += forecast.upcomingIn;
          result[curr].out += forecast.upcomingOut;
          result[curr].projected += forecast.projected;
        }
      });
    });

    return result;
  }, [activeAccounts, finance.ledgers, finance.today, horizonEnd]);

  const rate = settings.exchangeRate?.rate;
  const hasRate = rate !== null && rate !== undefined && rate > 0;

  const convertedTotals = useMemo(() => {
    if (!hasRate) return null;
    const brlBalConverted = convertCents(totalsByCurrency.BRL.balance, 'BRL', currency, rate) ?? 0;
    const usdBalConverted = convertCents(totalsByCurrency.USD.balance, 'USD', currency, rate) ?? 0;
    const brlInConverted = convertCents(totalsByCurrency.BRL.in, 'BRL', currency, rate) ?? 0;
    const usdInConverted = convertCents(totalsByCurrency.USD.in, 'USD', currency, rate) ?? 0;
    const brlOutConverted = convertCents(totalsByCurrency.BRL.out, 'BRL', currency, rate) ?? 0;
    const usdOutConverted = convertCents(totalsByCurrency.USD.out, 'USD', currency, rate) ?? 0;
    const brlProjConverted = convertCents(totalsByCurrency.BRL.projected, 'BRL', currency, rate) ?? 0;
    const usdProjConverted = convertCents(totalsByCurrency.USD.projected, 'USD', currency, rate) ?? 0;

    return {
      balance:
        currency === 'USD'
          ? totalsByCurrency.USD.balance + brlBalConverted
          : totalsByCurrency.BRL.balance + usdBalConverted,
      in: currency === 'USD' ? totalsByCurrency.USD.in + brlInConverted : totalsByCurrency.BRL.in + usdInConverted,
      out: currency === 'USD' ? totalsByCurrency.USD.out + brlOutConverted : totalsByCurrency.BRL.out + usdOutConverted,
      projected:
        currency === 'USD'
          ? totalsByCurrency.USD.projected + brlProjConverted
          : totalsByCurrency.BRL.projected + usdProjConverted,
    };
  }, [hasRate, totalsByCurrency, currency, rate]);

  const handleSelect = (accountId: string) => {
    if (onAccountSelect) {
      onAccountSelect(accountId);
    } else {
      void navigate(`/accounts/${accountId}`);
    }
  };

  const handleOpenDelete = (acc: AccountConfig, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDeleteTargetAccount(acc);
    setDeleteDialogOpen(true);
  };

  const handleOpenArchive = (acc: AccountConfig, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setArchiveTargetAccount(acc);
    setArchiveDialogOpen(true);
  };

  const handleOpenRestore = (acc: AccountConfig, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRestoreTargetAccount(acc);
    setRestoreDialogOpen(true);
  };

  const handleOpenEdit = (acc: AccountConfig, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingAccount(acc);
  };

  const activeCards = filteredAccounts.map(acc => {
    const details = acc;
    const accCurrencies = getAccountCurrencies(acc);
    const isMultiCurrency = accCurrencies.length > 1;
    const primaryCurr = accCurrencies[0] || 'USD';
    const primaryLedger = finance.ledgers[`${acc.id}:${primaryCurr}`] ?? finance.ledgers[acc.id];
    const forecast = getAccountForecast(primaryLedger, finance.today, horizonEnd);

    return (
      <Card
        key={acc.id}
        className="p-6 bg-foreground/5 backdrop-blur-xl border border-border hover:border-theme-cyan/30 transition-all cursor-pointer group"
        onClick={() => handleSelect(acc.id)}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-sm flex-shrink-0"
              style={{ backgroundColor: getAccountColor(details.color) }}
            >
              {details.initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-foreground font-medium group-hover:text-theme-cyan transition-colors">
                  {details.name}
                </span>
                {isMultiCurrency && (
                  <Badge
                    variant="outline"
                    className="border-theme-cyan/40 bg-theme-cyan/10 text-theme-cyan text-[10px] px-1.5 py-0"
                  >
                    {t('accounts.multiCurrencyBadge')}
                  </Badge>
                )}
                {!isMultiCurrency && (
                  <Badge variant="outline" className="text-[10px] font-mono px-1 py-0 text-muted-foreground">
                    {primaryCurr}
                  </Badge>
                )}
              </div>
              <div className="text-muted-foreground text-sm">
                {details.kind === 'Checking'
                  ? t('accounts.dialog.checking')
                  : details.kind === 'Savings'
                    ? t('accounts.dialog.savings')
                    : details.kind === 'Cash'
                      ? t('accounts.dialog.cash')
                      : details.kind}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="text-right mr-1">
              {isMultiCurrency ? (
                <div className="space-y-0.5">
                  {accCurrencies.map(c => {
                    const l = finance.ledgers[`${acc.id}:${c}`] ?? finance.ledgers[acc.id];
                    const fc = getAccountForecast(l, finance.today, horizonEnd);
                    return (
                      <div key={c} className="text-foreground text-sm font-medium">
                        {formatCents(fc.current, c)}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-foreground text-xl font-medium">{formatCents(forecast.current, primaryCurr)}</div>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-foreground/10"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border-border">
                <DropdownMenuItem onClick={e => handleOpenEdit(acc, e)}>
                  <Pencil className="mr-2 h-3.5 w-3.5 text-theme-cyan" />
                  {t('accounts.editAccount')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={e => handleOpenArchive(acc, e)}>
                  <Archive className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  {t('accounts.archiveAccount')}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={e => handleOpenDelete(acc, e)}>
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  {t('accounts.deleteAccount')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mb-2">
          <CardBillSummary accountId={acc.id} account={acc} statements={finance.statements} />
          <div className="text-xs text-muted-foreground mb-2 mt-4 font-medium uppercase tracking-wider">
            {t('accounts.nextUp')}
          </div>
          <UpcomingList
            upcoming={forecast.upcoming}
            currentBalance={forecast.current}
            variant="compact"
            currency={primaryCurr}
          />
        </div>
        <div className="space-y-3 mt-6">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('accounts.upcomingIn')}</span>
            <span className="text-theme-green">+{formatCents(forecast.upcomingIn, primaryCurr)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('accounts.upcomingOut')}</span>
            <span className="text-theme-red">{formatCents(forecast.upcomingOut, primaryCurr)}</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-border/50">
            <span className="text-foreground font-medium">{t('accounts.projected')}</span>
            <span className="text-foreground font-medium">{formatCents(forecast.projected, primaryCurr)}</span>
          </div>

          {forecast.lowest.balance < Math.min(forecast.current, forecast.projected) && (
            <div className="text-xs text-theme-orange mt-2 p-2 bg-theme-orange/10 rounded-md">
              {t('accounts.dipsTo', {
                amount: formatCents(forecast.lowest.balance, primaryCurr),
                date: formatShort(forecast.lowest.date, locale),
              })}
            </div>
          )}

          <div className="pt-4 border-t border-border/50 flex items-center justify-between text-muted-foreground group-hover:text-theme-cyan transition-colors">
            <span className="text-sm font-medium">{t('accounts.viewAccountDetails')}</span>
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </Card>
    );
  });

  const archivedCards = archivedAccounts.map(acc => {
    const details = acc;
    const accCurrencies = getAccountCurrencies(acc);
    const primaryCurr = accCurrencies[0] || 'USD';
    const ledger = finance.ledgers[`${acc.id}:${primaryCurr}`] ?? finance.ledgers[acc.id];
    const forecast = getAccountForecast(ledger, finance.today, horizonEnd);

    return (
      <Card
        key={acc.id}
        className="p-6 bg-foreground/[0.03] backdrop-blur-xl border border-dashed border-border/80 hover:border-theme-cyan/40 transition-all opacity-85 hover:opacity-100 cursor-pointer group"
        onClick={() => handleSelect(acc.id)}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-sm flex-shrink-0 grayscale opacity-80"
              style={{ backgroundColor: getAccountColor(details.color) }}
            >
              {details.initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-foreground font-medium group-hover:text-theme-cyan transition-colors">
                  {details.name}
                </span>
                <Badge
                  variant="outline"
                  className="border-theme-orange/40 bg-theme-orange/10 text-theme-orange text-[10px] px-1.5 py-0"
                >
                  {t('accounts.archivedBadge')}
                </Badge>
              </div>
              <div className="text-muted-foreground text-sm">
                {details.kind === 'Checking'
                  ? t('accounts.dialog.checking')
                  : details.kind === 'Savings'
                    ? t('accounts.dialog.savings')
                    : details.kind === 'Cash'
                      ? t('accounts.dialog.cash')
                      : details.kind}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-muted-foreground text-lg font-medium">
              {formatCents(forecast.current, primaryCurr)}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border/50 flex items-center justify-between gap-2 mt-4">
          <Button size="sm" variant="cyan" onClick={e => handleOpenRestore(acc, e)} className="h-8 text-xs gap-1.5">
            <ArchiveRestore className="w-3.5 h-3.5" />
            {t('accounts.unarchiveAccount')}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={e => handleOpenDelete(acc, e)}
            className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t('accounts.deleteAccount')}
          </Button>
        </div>
      </Card>
    );
  });

  function handleSaveAccount(account: AccountConfig) {
    if (editingAccount) {
      dispatch({
        type: 'account/update',
        payload: {
          id: account.id,
          changes: {
            name: account.name,
            kind: account.kind,
            initials: account.initials,
            color: account.color,
            currencies: account.currencies,
            openingBalances: account.openingBalances,
            openingDate: account.openingDate,
            card: account.card,
            allowedPaymentMethods: account.allowedPaymentMethods,
            archived: account.archived,
          },
        },
      });
      notify.success('notifications.ops.accountUpdated', {
        id: `account-saved-${account.id}`,
        params: { name: account.name },
      });
      setEditingAccount(null);
    } else {
      dispatch({ type: 'account/add', payload: account });
      notify.success('notifications.ops.accountCreated', {
        id: `account-saved-${account.id}`,
        params: { name: account.name },
      });
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div role="heading" aria-level={1} className="text-foreground text-3xl mb-2">
            {t('accounts.title')}
          </div>
          <div className="text-muted-foreground">{t('accounts.subtitle')}</div>
        </div>
        <div className="flex items-center gap-3">
          <UpcomingPeriodFilter value={upcomingPeriod} onChange={setUpcomingPeriod} />
        </div>
      </div>

      {/* Notice if rate is not set: Breakdown fallback active */}
      {!hasRate && (
        <div className="p-3 rounded-lg border border-border/60 bg-foreground/5 text-xs text-muted-foreground flex items-center justify-between">
          <span>{t('accounts.rateUnavailableNotice')}</span>
          <span className="font-mono uppercase text-[10px] px-1.5 py-0.5 rounded bg-foreground/10 text-theme-cyan font-medium">
            {t('accounts.breakdown')}
          </span>
        </div>
      )}

      {/* Totals Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-foreground/5 border-border">
          <div className="text-sm text-muted-foreground mb-1">{t('accounts.totalBalance')}</div>
          {hasRate && convertedTotals ? (
            <div>
              <div className="text-2xl text-foreground font-semibold">
                {formatCents(convertedTotals.balance, currency)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatCents(totalsByCurrency.BRL.balance, 'BRL')} · {formatCents(totalsByCurrency.USD.balance, 'USD')}
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className="text-xl text-foreground font-semibold">
                {formatCents(totalsByCurrency.BRL.balance, 'BRL')}
              </div>
              <div className="text-xl text-foreground font-semibold">
                {formatCents(totalsByCurrency.USD.balance, 'USD')}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-4 bg-foreground/5 border-border">
          <div className="text-sm text-muted-foreground mb-1">{t('accounts.upcomingIn')}</div>
          {hasRate && convertedTotals ? (
            <div>
              <div className="text-2xl text-theme-green font-semibold">
                +{formatCents(convertedTotals.in, currency)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                +{formatCents(totalsByCurrency.BRL.in, 'BRL')} · +{formatCents(totalsByCurrency.USD.in, 'USD')}
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className="text-xl text-theme-green font-semibold">
                +{formatCents(totalsByCurrency.BRL.in, 'BRL')}
              </div>
              <div className="text-xl text-theme-green font-semibold">
                +{formatCents(totalsByCurrency.USD.in, 'USD')}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-4 bg-foreground/5 border-border">
          <div className="text-sm text-muted-foreground mb-1">{t('accounts.upcomingOut')}</div>
          {hasRate && convertedTotals ? (
            <div>
              <div className="text-2xl text-theme-red font-semibold">{formatCents(convertedTotals.out, currency)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatCents(totalsByCurrency.BRL.out, 'BRL')} · {formatCents(totalsByCurrency.USD.out, 'USD')}
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className="text-xl text-theme-red font-semibold">{formatCents(totalsByCurrency.BRL.out, 'BRL')}</div>
              <div className="text-xl text-theme-red font-semibold">{formatCents(totalsByCurrency.USD.out, 'USD')}</div>
            </div>
          )}
        </Card>

        <Card className="p-4 bg-theme-cyan/10 border-theme-cyan/30">
          <div className="text-sm text-theme-cyan mb-1">{t('accounts.projected')}</div>
          {hasRate && convertedTotals ? (
            <div>
              <div className="text-2xl text-theme-cyan font-semibold">
                {formatCents(convertedTotals.projected, currency)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatCents(totalsByCurrency.BRL.projected, 'BRL')} ·{' '}
                {formatCents(totalsByCurrency.USD.projected, 'USD')}
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className="text-xl text-theme-cyan font-semibold">
                {formatCents(totalsByCurrency.BRL.projected, 'BRL')}
              </div>
              <div className="text-xl text-theme-cyan font-semibold">
                {formatCents(totalsByCurrency.USD.projected, 'USD')}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Currency Filter Tabs */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={currencyFilter === 'all' ? 'cyan' : 'outline'}
          onClick={() => setCurrencyFilter('all')}
          className="h-8 text-xs"
        >
          {t('accounts.filterAll')}
        </Button>
        <Button
          size="sm"
          variant={currencyFilter === 'BRL' ? 'cyan' : 'outline'}
          onClick={() => setCurrencyFilter('BRL')}
          className="h-8 text-xs"
        >
          {t('accounts.filterBRL')} (R$)
        </Button>
        <Button
          size="sm"
          variant={currencyFilter === 'USD' ? 'cyan' : 'outline'}
          onClick={() => setCurrencyFilter('USD')}
          className="h-8 text-xs"
        >
          {t('accounts.filterUSD')} ($)
        </Button>
      </div>

      {/* Active Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeCards}
        <button
          type="button"
          onClick={() => {
            setEditingAccount(null);
            setDialogOpen(true);
          }}
          className="group relative flex h-full min-h-[350px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border/80 bg-foreground/[0.02] p-6 text-center transition-all hover:border-theme-cyan/50 hover:bg-theme-cyan/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-cyan/50 cursor-pointer"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border/80 text-muted-foreground shadow-sm transition-all group-hover:scale-105 group-hover:border-theme-cyan/60 group-hover:bg-theme-cyan/10 group-hover:text-theme-cyan">
            <Plus className="h-6 w-6" />
          </div>
          <span className="text-sm font-medium text-muted-foreground transition-colors group-hover:text-theme-cyan">
            {t('accounts.addAccount')}
          </span>
        </button>
      </div>

      {/* Archived Accounts Section */}
      {archivedAccounts.length > 0 && (
        <div className="border border-border/60 rounded-xl bg-foreground/[0.02] p-6 backdrop-blur-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-theme-orange/10 text-theme-orange">
                <Archive className="h-5 w-5" />
              </div>
              <div>
                <div className="text-foreground font-medium flex items-center gap-2">
                  <span>{t('accounts.archivedSectionTitle', { count: archivedAccounts.length })}</span>
                  <Badge
                    variant="outline"
                    className="border-theme-orange/40 bg-theme-orange/10 text-theme-orange text-xs"
                  >
                    {t('accounts.archivedBadge')}
                  </Badge>
                </div>
                <div className="text-muted-foreground text-xs">{t('accounts.archivedSectionDesc')}</div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              className="h-8 gap-1.5 border-border bg-foreground/5 text-foreground hover:bg-foreground/10 text-xs"
            >
              {showArchived
                ? t('accounts.hideArchived')
                : t('accounts.showArchived', { count: archivedAccounts.length })}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showArchived ? 'rotate-180' : ''}`} />
            </Button>
          </div>

          {showArchived && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">{archivedCards}</div>
          )}
        </div>
      )}

      <AccountFormDialog
        open={dialogOpen || Boolean(editingAccount)}
        onOpenChange={open => {
          if (!open) {
            setDialogOpen(false);
            setEditingAccount(null);
          }
        }}
        account={editingAccount}
        transactions={transactions}
        onSave={handleSaveAccount}
        onDeleteOrArchive={acc => {
          setEditingAccount(null);
          setDialogOpen(false);
          const hasTx = transactions.some(t => t.accountId === acc.id);
          if (hasTx) {
            setArchiveTargetAccount(acc);
            setArchiveDialogOpen(true);
          } else {
            setDeleteTargetAccount(acc);
            setDeleteDialogOpen(true);
          }
        }}
      />

      <DeleteAccountDialog
        account={deleteTargetAccount}
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeleteTargetAccount(null);
        }}
        transactions={transactions}
        onSwitchToArchive={acc => {
          setDeleteDialogOpen(false);
          setDeleteTargetAccount(null);
          setArchiveTargetAccount(acc);
          setArchiveDialogOpen(true);
        }}
      />

      <ArchiveAccountDialog
        account={archiveTargetAccount}
        open={archiveDialogOpen}
        onClose={() => {
          setArchiveDialogOpen(false);
          setArchiveTargetAccount(null);
        }}
        transactions={transactions}
        recurringRules={financeContext.recurringRules}
      />

      <RestoreAccountDialog
        account={restoreTargetAccount}
        open={restoreDialogOpen}
        onClose={() => {
          setRestoreDialogOpen(false);
          setRestoreTargetAccount(null);
        }}
      />
    </div>
  );
}
