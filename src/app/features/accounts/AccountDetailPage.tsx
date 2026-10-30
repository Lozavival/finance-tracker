import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { type CardStatement } from '@/data/cardStatements';
import { type AccountLedger, getAccountForecast } from '@/data/ledger';
import { buildDailySeries } from '@/data/ledger';
import { UpcomingList } from './UpcomingList';
import { CardStatementsPanel } from './CardStatementsPanel';
import { BalanceProjectionChart } from './BalanceProjectionChart';
import { Card } from '@/components/primitives/card';
import { Button } from '@/components/primitives/button';
import { Badge } from '@/components/primitives/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import {
  resolvePeriodRange,
  type PeriodFilter as PeriodFilterType,
  sortTransactionsDescending,
  type Transaction,
} from '@/data/transactions';
import { ArrowLeft, Pencil, Archive, ArchiveRestore, Trash2, MoreVertical } from 'lucide-react';
import { TransactionsMonthTable } from '@/components/shared/TransactionsMonthTable';
import { TransactionDialogs } from '@/components/shared/transaction-dialogs/TransactionDialogs';
import { PeriodFilter } from '@/components/shared/filters/PeriodFilter';
import { UpcomingPeriodFilter } from '@/components/shared/filters/UpcomingPeriodFilter';
import { resolveUpcomingHorizon, getToday, type UpcomingPeriodType } from '@/data/dates';
import { useSettings } from '@/state/SettingsContext';
import { useFinance } from '@/state/FinanceContext';
import { useTransactionActions } from '@/state/useTransactionActions';
import { getAccountColor, getAccountCurrencies, type AccountConfig } from '@/data/settings';
import { type SupportedCurrency } from '@/i18n/types';
import { getIcon } from '@/data/icons';
import { AccountFormDialog } from './AccountFormDialog';
import { DeleteAccountDialog } from './DeleteAccountDialog';
import { ArchiveAccountDialog } from './ArchiveAccountDialog';
import { RestoreAccountDialog } from './RestoreAccountDialog';
import { useNotify } from '@/state/NotificationsContext';
import { useI18n } from '@/i18n';

type AccountDetailPageProps = {
  accountId?: string;
  finance?: {
    statements: CardStatement[];
    ledgers: Record<string, AccountLedger>;
    today: Date;
  };
  transactions?: Transaction[];
  onTransactionsChange?: (txs: Transaction[]) => void;
  onBack?: () => void;
};

export function AccountDetailPage({
  accountId: propAccountId,
  finance: propFinance,
  transactions: propTransactions,
  onBack,
}: AccountDetailPageProps) {
  const { accountId: routeAccountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const financeContext = useFinance();
  const finance = propFinance ?? financeContext;
  const transactions = propTransactions ?? financeContext.transactions;
  const accountId = propAccountId || routeAccountId || '';

  const { findAccount, dispatch, settings, getAllowedPaymentMethodIds } = useSettings();
  const { t, formatCents } = useI18n();
  const notify = useNotify();
  const details = findAccount(accountId);

  const currencies = useMemo<SupportedCurrency[]>(() => {
    return details ? getAccountCurrencies(details) : (['USD'] as SupportedCurrency[]);
  }, [details]);
  const isMultiCurrency = currencies.length > 1;
  const [activePocket, setActivePocket] = useState<SupportedCurrency>(currencies[0] || 'USD');

  useEffect(() => {
    if (!currencies.includes(activePocket)) {
      setActivePocket(currencies[0] || 'USD');
    }
  }, [currencies, activePocket]);

  const ledger = finance.ledgers[`${accountId}:${activePocket}`] ?? finance.ledgers[accountId];

  const allowedMethodIds = useMemo(() => {
    return getAllowedPaymentMethodIds(details);
  }, [details, getAllowedPaymentMethodIds]);

  const allowedMethods = useMemo(() => {
    return settings.paymentMethods.filter(m => allowedMethodIds.includes(m.id));
  }, [settings.paymentMethods, allowedMethodIds]);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [upcomingPeriod, setUpcomingPeriod] = useState<UpcomingPeriodType>({ kind: 'end-of-month' });

  const upcomingLimitDate = useMemo(() => {
    return resolveUpcomingHorizon(upcomingPeriod, finance.today);
  }, [finance.today, upcomingPeriod]);

  // Forecast used in header cards and upcoming list
  const fullForecast = getAccountForecast(ledger, finance.today, upcomingLimitDate);

  let chartEndDate = upcomingLimitDate;
  if (upcomingPeriod.kind === 'all' || (upcomingPeriod.kind === 'custom' && !upcomingPeriod.until)) {
    if (fullForecast.upcoming.length > 0) {
      chartEndDate = fullForecast.upcoming[fullForecast.upcoming.length - 1].date;
    } else {
      const fallback = new Date(finance.today);
      fallback.setDate(fallback.getDate() + 30);
      chartEndDate = fallback;
    }
  }

  const dFrom = new Date(finance.today);
  dFrom.setDate(dFrom.getDate() - 30);
  const series = buildDailySeries(ledger, dFrom, chartEndDate, finance.today);

  const {
    dialogOpen,
    setDialogOpen,
    editingTarget,
    setEditingTarget,
    deleteTarget,
    setDeleteTarget,
    openEditDialog,
    saveTransaction,
    deleteTransaction,
  } = useTransactionActions();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      void navigate('/accounts');
    }
  };

  const [period, setPeriod] = useState<PeriodFilterType>({ kind: 'preset', days: 30 });

  useEffect(() => {
    const range = resolvePeriodRange(period, finance.today);
    void financeContext.ensureTransactionsLoaded(range ? range.from : null);
  }, [period, finance.today, financeContext]);

  const visibleTransactions = useMemo(() => {
    const periodRange = resolvePeriodRange(period, finance.today);
    const filtered = transactions
      .filter(transaction => transaction.accountId === accountId)
      .filter(transaction => {
        if (isMultiCurrency && transaction.currency !== activePocket) {
          return false;
        }
        if (periodRange) {
          if (
            transaction.date.getTime() < periodRange.from.getTime() ||
            transaction.date.getTime() > periodRange.to.getTime()
          ) {
            return false;
          }
        }
        return true;
      });
    return sortTransactionsDescending(filtered);
  }, [period, transactions, accountId, isMultiCurrency, activePocket, finance.today]);

  if (!details) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-8 px-2 text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm -ml-2"
        >
          <ArrowLeft className="w-4 h-4" /> {t('accounts.backToAccounts')}
        </Button>
        <div className="text-foreground text-xl">{t('accounts.accountNotFound')}</div>
      </div>
    );
  }

  function handleSaveAccount(updated: AccountConfig) {
    const p = dispatch({
      type: 'account/update',
      payload: {
        id: updated.id,
        changes: {
          name: updated.name,
          kind: updated.kind,
          initials: updated.initials,
          color: updated.color,
          currencies: updated.currencies,
          openingBalances: updated.openingBalances,
          openingDate: updated.openingDate,
          card: updated.card,
          allowedPaymentMethods: updated.allowedPaymentMethods,
        },
      },
    });
    notify.successWhen(p, 'notifications.ops.accountUpdated', {
      id: `account-saved-${updated.id}`,
      params: { name: updated.name },
    });
  }

  return (
    <div className="space-y-8">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBack}
        className="h-8 px-2 text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm -ml-2"
      >
        <ArrowLeft className="w-4 h-4" /> {t('accounts.backToAccounts')}
      </Button>

      {details.archived && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-theme-orange/30 bg-theme-orange/10 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Archive className="w-5 h-5 text-theme-orange flex-shrink-0" />
            <div className="text-sm text-foreground">
              <span className="font-semibold text-theme-orange mr-2">[{t('accounts.archivedBadge')}]</span>
              {t('accounts.archivedAlert')}
            </div>
          </div>
          <Button
            size="sm"
            variant="cyan"
            onClick={() => setRestoreDialogOpen(true)}
            className="h-8 gap-1.5 text-xs whitespace-nowrap"
          >
            <ArchiveRestore className="w-3.5 h-3.5" />
            {t('accounts.unarchiveAccount')}
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-medium shadow-sm flex-shrink-0"
            style={{ backgroundColor: getAccountColor(details.color) }}
          >
            {details.initials}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <div role="heading" aria-level={1} className="text-foreground text-3xl mb-1">
                {details.name}
              </div>
              {details.archived && (
                <Badge
                  variant="outline"
                  className="border-theme-orange/40 bg-theme-orange/10 text-theme-orange text-xs"
                >
                  {t('accounts.archivedBadge')}
                </Badge>
              )}
              {isMultiCurrency && (
                <Badge variant="outline" className="border-theme-cyan/40 bg-theme-cyan/10 text-theme-cyan text-xs">
                  {t('accounts.multiCurrencyBadge')}
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-foreground/10"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-popover border-border">
                  <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                    <Pencil className="mr-2 h-3.5 w-3.5 text-theme-cyan" />
                    {t('accounts.editAccount')}
                  </DropdownMenuItem>
                  {details.archived ? (
                    <DropdownMenuItem onClick={() => setRestoreDialogOpen(true)}>
                      <ArchiveRestore className="mr-2 h-3.5 w-3.5 text-theme-cyan" />
                      {t('accounts.unarchiveAccount')}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => setArchiveDialogOpen(true)}>
                      <Archive className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                      {t('accounts.archiveAccount')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} variant="destructive">
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    {t('accounts.deleteAccount')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-muted-foreground text-sm">
                {details.kind === 'Checking'
                  ? t('accounts.dialog.checking')
                  : details.kind === 'Savings'
                    ? t('accounts.dialog.savings')
                    : details.kind === 'Cash'
                      ? t('accounts.dialog.cash')
                      : details.kind}
              </span>
              {allowedMethods.length > 0 && (
                <>
                  <span className="text-muted-foreground/40 text-xs">•</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {allowedMethods.map(m => {
                      const Icon = getIcon(m.icon);
                      return (
                        <span
                          key={m.id}
                          className="inline-flex items-center gap-1 rounded-full bg-foreground/5 border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground"
                        >
                          <Icon className="w-3 h-3 text-theme-cyan" />
                          <span>{m.name}</span>
                        </span>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {isMultiCurrency && (
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {t('accounts.pockets')}:
                </span>
                <div className="flex gap-1.5">
                  {currencies.map(curr => (
                    <Button
                      key={curr}
                      size="sm"
                      variant={activePocket === curr ? 'cyan' : 'outline'}
                      onClick={() => setActivePocket(curr)}
                      className="h-7 px-3 text-xs"
                    >
                      {curr === 'BRL' ? t('accounts.pocketBRL') : t('accounts.pocketUSD')} (
                      {curr === 'BRL' ? 'R$' : '$'})
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 mb-1">
          <UpcomingPeriodFilter value={upcomingPeriod} onChange={setUpcomingPeriod} />
        </div>
      </div>

      <div className="grid grid-cols-1 @sm/main:grid-cols-2 @4xl/main:grid-cols-4 gap-4">
        <Card className="p-4 bg-foreground/5 border-border">
          <div className="text-sm text-muted-foreground mb-1">{t('accounts.currentBalance')}</div>
          <div className="text-2xl text-foreground tabular-nums truncate">
            {formatCents(fullForecast.current, activePocket)}
          </div>
        </Card>
        <Card className="p-4 bg-foreground/5 border-border">
          <div className="text-sm text-muted-foreground mb-1">{t('accounts.upcomingIn')}</div>
          <div className="text-2xl text-theme-green tabular-nums truncate">
            +{formatCents(fullForecast.upcomingIn, activePocket)}
          </div>
        </Card>
        <Card className="p-4 bg-foreground/5 border-border">
          <div className="text-sm text-muted-foreground mb-1">{t('accounts.upcomingOut')}</div>
          <div className="text-2xl text-theme-red tabular-nums truncate">
            {formatCents(fullForecast.upcomingOut, activePocket)}
          </div>
        </Card>
        <Card className="p-4 bg-theme-cyan/10 border-theme-cyan/30">
          <div className="text-sm text-theme-cyan mb-1">{t('accounts.projected')}</div>
          <div className="text-2xl text-theme-cyan tabular-nums truncate">
            {formatCents(fullForecast.projected, activePocket)}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 @4xl/main:grid-cols-3 gap-6">
        <Card className="p-4 sm:p-6 bg-foreground/5 border-border @4xl/main:col-span-2 min-w-0">
          <div className="text-xl text-foreground mb-4">{t('accounts.balanceProjection')}</div>
          <BalanceProjectionChart series={series} today={finance.today} currency={activePocket} />
        </Card>

        <Card className="p-4 sm:p-6 bg-foreground/5 border-border min-w-0">
          <div className="text-xl text-foreground mb-4">{t('accounts.upcoming')}</div>
          <UpcomingList
            upcoming={fullForecast.upcoming}
            currentBalance={fullForecast.current}
            variant="full"
            currency={activePocket}
          />
        </Card>
      </div>

      <CardStatementsPanel accountId={accountId} statements={finance.statements} />

      <Card className="p-4 sm:p-6 bg-foreground/5 border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
          <div className="text-xl text-foreground">{t('accounts.transactions')}</div>
          <div className="w-full sm:w-52">
            <PeriodFilter value={period} onChange={setPeriod} />
          </div>
        </div>
        <TransactionsMonthTable
          transactions={visibleTransactions}
          onEdit={openEditDialog}
          onDelete={setDeleteTarget}
          showAccount={false}
        />
        {visibleTransactions.length === 0 && (
          <div className="text-muted-foreground text-sm">{t('accounts.noTransactionsFound')}</div>
        )}
      </Card>

      <TransactionDialogs
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        editingTarget={editingTarget}
        setEditingTarget={setEditingTarget}
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        defaultDate={getToday()}
        defaultAccount={accountId}
        onSave={saveTransaction}
        onDelete={deleteTransaction}
      />

      <AccountFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        account={details}
        transactions={transactions}
        onSave={handleSaveAccount}
        onDeleteOrArchive={() => {
          const hasTx = transactions.some(t => t.accountId === details.id);
          if (hasTx) {
            setArchiveDialogOpen(true);
          } else {
            setDeleteDialogOpen(true);
          }
        }}
      />

      <DeleteAccountDialog
        account={details}
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        transactions={transactions}
        onDeleted={handleBack}
        onSwitchToArchive={() => {
          setDeleteDialogOpen(false);
          setArchiveDialogOpen(true);
        }}
      />

      <ArchiveAccountDialog
        account={details}
        open={archiveDialogOpen}
        onClose={() => setArchiveDialogOpen(false)}
        transactions={transactions}
        recurringRules={financeContext.recurringRules}
      />

      <RestoreAccountDialog account={details} open={restoreDialogOpen} onClose={() => setRestoreDialogOpen(false)} />
    </div>
  );
}
