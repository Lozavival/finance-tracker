import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Repeat, CreditCard, ArrowRight, Loader2, Wallet } from 'lucide-react';
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from '@/components/primitives/command';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/primitives/popover';
import { Badge } from '@/components/primitives/badge';
import { Skeleton } from '@/components/primitives/skeleton';
import { CategoryChip } from '@/components/shared/CategoryChip';
import { HighlightedText } from '@/components/shared/HighlightedText';
import { useTransactionSearch } from '@/state/useTransactionSearch';
import { useSettings } from '@/state/SettingsContext';
import { useI18n } from '@/i18n';
import { SEARCH_MIN_LENGTH, collapseSearchResults, matchAccounts } from '@/data/search';
import { formatRowDate } from '@/data/dates';
import { formatSignedValue } from '@/data/transactions';
import { getAccountColor } from '@/data/settings';

export function GlobalSearch() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { settings, findType, findAccount } = useSettings();

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { status, transactions, totalCount, tokens } = useTransactionSearch(query, {
    limit: 200,
    debounceMs: 180,
  });

  const matchedAccounts = useMemo(() => {
    return matchAccounts(settings.accounts, query, 4);
  }, [settings.accounts, query]);

  const previewGroups = useMemo(() => {
    return collapseSearchResults(transactions).slice(0, 5);
  }, [transactions]);

  // Global keyboard shortcuts: ⌘K / Ctrl+K and '/' (when not focused in an input/textarea)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
        return;
      }

      if (e.key === '/' && !open) {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        const isEditable = (document.activeElement as HTMLElement)?.isContentEditable;
        if (activeTag !== 'input' && activeTag !== 'textarea' && !isEditable) {
          e.preventDefault();
          inputRef.current?.focus();
          setOpen(true);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handleSelectSeeAll = () => {
    if (!query.trim()) return;
    setOpen(false);
    const targetQ = encodeURIComponent(query.trim());
    setQuery('');
    void navigate(`/transactions?q=${targetQ}`);
  };

  const handleSelectAccount = (accountId: string) => {
    setOpen(false);
    setQuery('');
    void navigate(`/accounts/${accountId}`);
  };

  const isQueryTooShort = query.trim().length > 0 && query.trim().length < SEARCH_MIN_LENGTH;
  const hasNoResults =
    status === 'success' && matchedAccounts.length === 0 && previewGroups.length === 0 && !isQueryTooShort;

  return (
    <Command shouldFilter={false} className="overflow-visible bg-transparent border-none rounded-lg">
      <Popover open={open && query.trim().length > 0} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="relative group w-full">
            <div className="relative flex items-center">
              <CommandInput
                ref={inputRef}
                value={query}
                onValueChange={val => {
                  setQuery(val);
                  if (val.trim().length > 0 && !open) {
                    setOpen(true);
                  }
                }}
                onFocus={() => {
                  if (query.trim().length > 0) {
                    setOpen(true);
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    // If an account is matched as the sole result, navigate to it; otherwise open full search
                    if (matchedAccounts.length > 0 && previewGroups.length === 0) {
                      handleSelectAccount(matchedAccounts[0].account.id);
                    } else {
                      handleSelectSeeAll();
                    }
                  } else if (e.key === 'Escape') {
                    setOpen(false);
                  }
                }}
                placeholder={t('nav.searchPlaceholder')}
                wrapperClassName="h-10 px-3 bg-foreground/5 border border-theme-cyan/30 rounded-lg focus-within:border-theme-cyan focus-within:shadow-[0_0_20px_var(--shadow-glow-cyan)] transition-all duration-300 w-full"
                className="h-9 text-foreground placeholder:text-muted-foreground outline-hidden pr-14"
              />
              <div className="absolute right-3 flex items-center gap-1.5 pointer-events-none">
                {status === 'loading' ? <Loader2 className="w-4 h-4 text-theme-cyan animate-spin" /> : null}
              </div>
            </div>
          </div>
        </PopoverAnchor>

        <PopoverContent
          align="start"
          sideOffset={6}
          onOpenAutoFocus={e => e.preventDefault()}
          onCloseAutoFocus={e => e.preventDefault()}
          onFocusOutside={e => e.preventDefault()}
          className="w-(--radix-popover-trigger-width) min-w-[320px] max-w-[620px] p-0 bg-popover/95 backdrop-blur-xl border-border/80 shadow-2xl rounded-xl overflow-hidden z-50"
        >
          <CommandList className="max-h-[420px] p-1.5 overflow-y-auto">
            {isQueryTooShort && (
              <div className="p-4 text-center text-xs text-muted-foreground">
                {t('search.minChars', { count: SEARCH_MIN_LENGTH })}
              </div>
            )}

            {status === 'loading' && previewGroups.length === 0 && matchedAccounts.length === 0 && (
              <div className="p-2 space-y-2">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            )}

            {status === 'error' && <div className="p-4 text-center text-xs text-destructive">{t('search.error')}</div>}

            {hasNoResults && (
              <CommandEmpty className="p-6 text-center text-sm text-muted-foreground">
                {t('search.noOmniResults', { query: query.trim() })}
              </CommandEmpty>
            )}

            {/* ACCOUNTS GROUP */}
            {matchedAccounts.length > 0 && (
              <CommandGroup
                heading={t('nav.accounts')}
                className="text-xs font-semibold text-muted-foreground px-2 pt-1 pb-1 uppercase tracking-wider"
              >
                {matchedAccounts.map(({ account, tokens: accTokens }) => {
                  const colorHex = getAccountColor(account.color);
                  return (
                    <CommandItem
                      key={`acc-${account.id}`}
                      value={`acc-${account.id}`}
                      onSelect={() => handleSelectAccount(account.id)}
                      className="flex items-center justify-between p-2.5 rounded-lg hover:bg-theme-cyan/10 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-foreground border border-border"
                          style={{ backgroundColor: `${colorHex}25`, borderColor: `${colorHex}60` }}
                        >
                          {account.initials}
                        </div>
                        <div className="min-w-0 flex flex-col">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground group-hover:text-theme-cyan transition-colors truncate">
                            <HighlightedText text={account.name} tokens={accTokens} />
                            <Badge
                              variant="outline"
                              className="border-border bg-foreground/10 text-muted-foreground text-[10px] px-1.5 py-0 h-4"
                            >
                              {account.kind}
                            </Badge>
                          </div>
                          {account.card?.name && (
                            <div className="text-xs text-muted-foreground truncate">{account.card.name}</div>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex items-center gap-1 text-muted-foreground text-xs">
                        <Wallet className="w-3.5 h-3.5 text-theme-cyan" />
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {/* TRANSACTIONS GROUP */}
            {previewGroups.length > 0 && (
              <CommandGroup
                heading={t('nav.transactions')}
                className="text-xs font-semibold text-muted-foreground px-2 pt-1 pb-1 uppercase tracking-wider"
              >
                {previewGroups.map(group => {
                  const tx = group.representative;
                  const typeConfig = findType(tx.typeId);
                  const accountConfig = findAccount(tx.accountId);
                  const formattedValue = formatSignedValue(tx, locale);

                  const isIncome = tx.direction === 'income';
                  const isTransfer = Boolean(tx.transferId);

                  return (
                    <CommandItem
                      key={group.key}
                      value={group.key}
                      onSelect={handleSelectSeeAll}
                      className="flex items-center justify-between p-2.5 rounded-lg hover:bg-theme-cyan/10 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <div className="shrink-0">
                          <CategoryChip typeConfig={typeConfig} label={tx.typeId} />
                        </div>
                        <div className="min-w-0 flex flex-col">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground group-hover:text-theme-cyan transition-colors truncate">
                            <HighlightedText text={tx.description} tokens={tokens} />
                            {group.kind === 'recurring' && (
                              <Badge
                                variant="outline"
                                title={t('search.recurringSeries')}
                                className="border-theme-cyan/30 bg-theme-cyan/15 text-theme-cyan text-[10px] px-1 py-0 h-4 gap-0.5 inline-flex items-center shrink-0"
                              >
                                <Repeat className="w-2.5 h-2.5" />
                                <span>{t('search.occurrences', { count: group.count })}</span>
                              </Badge>
                            )}
                            {group.kind === 'installments' && (
                              <Badge
                                variant="outline"
                                title={t('search.installmentSeries')}
                                className="border-border bg-foreground/10 text-muted-foreground text-[10px] px-1 py-0 h-4 gap-0.5 inline-flex items-center shrink-0"
                              >
                                <CreditCard className="w-2.5 h-2.5" />
                                <span>{t('search.occurrences', { count: group.count })}</span>
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {accountConfig?.name ?? tx.accountId} · {formatRowDate(tx.date, locale)}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-sm font-semibold tabular-nums ${
                            isTransfer ? 'text-muted-foreground' : isIncome ? 'text-theme-green' : 'text-foreground'
                          }`}
                        >
                          {formattedValue}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>

          {query.trim().length >= SEARCH_MIN_LENGTH && (
            <div className="border-t border-border/60 p-2 bg-foreground/5">
              <button
                type="button"
                onClick={handleSelectSeeAll}
                className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-theme-cyan hover:bg-theme-cyan/10 transition-colors font-medium cursor-pointer"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Search className="w-3.5 h-3.5 shrink-0" />
                  {totalCount === 1
                    ? t('search.seeAllSingle', { query: query.trim() })
                    : t('search.seeAll', { count: totalCount, query: query.trim() })}
                </span>
                <span className="flex items-center gap-1 shrink-0 text-muted-foreground text-[10px]">
                  <ArrowRight className="w-3 h-3 text-theme-cyan" />
                </span>
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </Command>
  );
}
