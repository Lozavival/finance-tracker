# User Flows

This document describes the operational user journeys of the Finance Tracker application, detailing the step-by-step sequences for transaction tracking, installment management, credit card statement resolution, double-entry transfers, recurring subscriptions, account safeguards, category reassignment, budget forecasting, search, internationalization, and offline synchronization. Each flow reflects an authentic user interaction with clear entry points, observable UI behavior, state transitions, and integration points with the persistence engine.

## Flow A: Recording an Income or Expense Transaction

**When it happens:** User records daily expenses (e.g., dining, groceries) or income entries (e.g., salary, freelance payment) into the ledger.

**Goal:** Accurately record monetary activity, assign it to an account and category, and update real-time KPI totals and account balances.

**Implementation:** `useTransactionActions.openAddDialog` → `TransactionFormDialog.handleSubmit` → `useTransactionActions.saveTransaction` → `FinanceContext.saveTransactionDraft` → `SqliteRepository.saveTransactionDraft` → `NotificationsContext.notify.successWhen`

1. User navigates to `/transactions` and clicks "+ Add Transaction".
2. The transaction dialog opens with single expense mode selected by default.
3. User selects flow direction: "Expense" (styled with red/orange theme accents) or "Income" (styled with green theme accents).
4. User enters description, transaction date, amount, account, category type, and payment method.
5. If required fields are missing or amount is non-positive, validation highlights invalid fields with inline error messages → **END**.
6. User clicks "Add Transaction"; dialog closes, transaction is appended to the ledger, and the record is persisted to the database.
7. A temporary success notification confirms the creation.
8. The transaction appears in the monthly transactions table with signed monetary formatting and category chip; Dashboard KPI cards (Total Balance, Inflow, Outflow, Net Savings) recalculate in real-time.

## Flow B: Editing an Existing Transaction

**When it happens:** User needs to correct a typo in description, update value, reassign account/category, or change the date of an existing transaction.

**Goal:** Update transaction details while keeping account balances, category summaries, and monthly statements synchronized.

**Implementation:** `TransactionsMonthTable.openEdit` → `useTransactionActions.openEditDialog` → `TransactionFormDialog.handleSubmit` → `useTransactionActions.saveTransaction` → `FinanceContext.saveTransactionDraft` → `SqliteRepository.saveTransactionDraft`

1. User navigates to `/transactions` and locates the transaction row, or selects the item from global search.
2. User opens the row action menu and clicks "Edit".
3. The transaction dialog opens preloaded with the existing transaction data.
4. User modifies target fields (e.g., adjusts amount or selects a new category).
5. If user changes the account or amount, validation ensures the payment method remains valid for the chosen account; if required fields are invalid, an inline error message appears → **END**.
6. User clicks "Save Changes"; dialog closes, table row is updated, and changes persist to the repository.
7. Success notification confirms "Transaction updated" and all associated account balances and category charts refresh.

## Flow C: Deleting and Restoring a Transaction (Undo)

**When it happens:** User accidentally creates or wants to remove an obsolete income or expense entry.

**Goal:** Safely remove a transaction while providing a 6-second safety window with one-click undo restoration before permanent database deletion.

**Implementation:** `TransactionsMonthTable.openDelete` → `DeleteTransactionDialog.confirm` → `useTransactionActions.deleteTransaction` → `FinanceContext.deleteTransactionTarget` → `NotificationsContext.notify.undoable` → `undoCallback`

1. User locates the transaction row on `/transactions` and selects "Exclude" from the row action menu.
2. A confirmation dialog opens requesting confirmation to exclude the transaction (if the transaction belongs to a recurring series, the user can choose to delete only this occurrence, this and future occurrences, or all occurrences in the series).
3. User confirms deletion; dialog closes and the transaction is immediately removed from the active view and monthly totals.
4. A floating undo notification displays with a 6-second countdown timer.
5. If user clicks "Undo" before the timer expires, the transaction is immediately restored to the table and scheduled database deletion is canceled → **END**.
6. If the 6-second timer expires without user interaction, permanent deletion is committed to database.

## Flow D: Splitting an Expense into Multi-Month Installments

**When it happens:** User makes a large purchase using a credit card and wants to distribute payments across 2 to 48 monthly installments.

**Goal:** Divide the total amount across monthly terms with cent-exact remainder distribution to the first installment, calculating clamped calendar due dates.

**Implementation:** `useTransactionActions.openAddDialog` → `TransactionFormDialog.setInstallments` → `installments.splitInstallmentValues` → `installments.buildInstallments` → `FinanceContext.saveTransactionDraft` → `SqliteRepository.saveTransactionDraft`

1. User clicks "+ Add Transaction" on `/transactions` in "Expense" mode.
2. User enters total purchase amount (e.g., $100.00), first installment date (e.g., 2026-01-31), selects an account with a credit card payment method, and inputs number of installments (2 to 48).
3. If the total amount is too small to allocate at least $0.01 per installment, validation displays an inline error and blocks submission → **END**.
4. The form calculates and displays a real-time cent-exact preview, allocating remainder cents to the first installment (e.g., $100.00 across 3 installments becomes 1 × $33.34 + 2 × $33.33).
5. Date clamping ensures subsequent installments stay on valid month-end days (e.g., Jan 31 → Feb 28/29 → Mar 31).
6. User clicks "Add Transaction"; each installment is assigned a shared group identifier and installment index labels (`1/3`, `2/3`, `3/3`).
7. The installment series is saved to the database.
8. In the transactions view, the installment series is automatically summarized as a single consolidated purchase (displaying the total amount and term badge, e.g., "3 Installments"), while individual account views reflect monthly payments as they occur.

## Flow E: Managing and Deleting Installment Series

**When it happens:** User returns an item or cancels an installment plan, needing to delete the installment series from future balances.

**Goal:** Remove all linked installments of a purchase series from future balances and statements with an undo safety window.

**Implementation:** `TransactionsMonthTable.openDelete` → `DeleteTransactionDialog.render` → `useTransactionActions.deleteTransaction` → `FinanceContext.deleteTransactionTarget` → `SqliteRepository.deleteTransactionTarget`

1. User locates an installment row in `/transactions` and clicks "Exclude".
2. The confirmation dialog recognizes that the transaction belongs to an installment series and informs the user that all installments in the series will be removed.
3. User clicks "Exclude" to confirm.
4. All linked installments are removed from the active table and credit card statement balances.
5. An undo notification displays confirming series deletion with an option to restore all installments within 6 seconds; if clicked, the series is restored → **END**.
6. If the 6-second timer expires without user interaction, the entire installment series is permanently deleted from the database.

## Flow F: Transferring Funds Between Accounts (Double-Entry & FX)

**When it happens:** User transfers money between two internal accounts (e.g., checking to savings, ATM cash withdrawal, or cross-currency transfer).

**Goal:** Atomically generate balanced dual reciprocal legs (an outgoing expense on the source account and an incoming credit on the destination account) linked as a single transfer pair.

**Implementation:** `useTransactionActions.openAddDialog` → `TransactionFormDialog.setTransfer` → `transactions.buildTransferLegs` → `FinanceContext.saveTransactionDraft` → `SqliteRepository.saveTransactionDraft`

1. User clicks "+ Add Transaction" and selects the "Transfer" mode.
2. User selects source account and destination account (and currency pockets if multi-currency).
3. If source and destination account and currency pocket are identical, validation displays an error and blocks submission → **END**.
4. User enters amount to send; if source and destination use different currencies (e.g., USD to BRL), user also enters amount to receive, displaying the calculated exchange rate notice (e.g., `1 USD = R$ 5.50`).
5. If any required amount is missing or non-positive, validation highlights the invalid field → **END**.
6. User clicks "Transfer"; two reciprocal transactions are generated:
   - Outgoing leg: recorded as an expense under the `transfer` category.
   - Incoming leg: recorded as an income under the `transfer` category.
   - Both legs are linked as a single transfer pair.
7. Both legs are saved together in an atomic transaction.
8. The source account balance decreases, destination account balance increases, and net worth remains unchanged.
9. Editing or deleting either leg automatically synchronizes both reciprocal legs.

## Flow G: Scheduling Recurring Incomes and Subscriptions

**When it happens:** User sets up regular commitments such as monthly subscriptions, rent, insurance, or regular paychecks.

**Goal:** Automate forward-looking cash flow projections by generating transactions across a 24-month horizon linked to a recurring rule.

**Implementation:** `RecurringRulesDialog.open` → `useTransactionActions.openAddDialog(recurring=true)` → `recurring.buildRecurringTransactions` → `FinanceContext.saveTransactionDraft` → `SqliteRepository.saveTransactionDraft`

1. User navigates to `/transactions` and clicks "Recurring Rules".
2. The recurring rules dialog opens displaying all configured recurring rules; user clicks "New rule".
3. Transaction form opens in recurring mode; user enters description, monthly amount, category, account, payment method, start date, and optional recurrence limit (ongoing or fixed number of occurrences).
4. If required fields are missing or amount is non-positive, validation highlights invalid fields → **END**.
5. User submits the rule; projected monthly occurrences are generated up to the 24-month horizon (or fixed count), linking each instance to the rule.
6. The recurring rule and projected occurrences are persisted to database.
7. Future occurrences populate future monthly transaction tables and integrate into the balance forecasting engine.
8. The new rule appears as active in the Recurring Rules dialog.

## Flow H: Canceling or Deleting Recurring Rules

**When it happens:** User cancels a subscription or wants to completely delete a recurring rule.

**Goal:** Cease future recurring occurrences while preserving historical transaction records prior to cancellation date.

**Implementation:** `RecurringRulesDialog.open` → `FinanceContext.cancelRecurringRule` | `FinanceContext.deleteRecurringRule` → `SqliteRepository.cancelRecurringRule`

1. User opens the Recurring Rules dialog from `/transactions`.
2. User finds the target rule and clicks "Stop Recurrence" (or "Delete").
3. If "Stop Recurrence" is chosen:
   - A confirmation dialog warns that future occurrences will be stopped while past history is preserved.
   - User confirms; rule status changes to `canceled` effective today.
   - All future occurrences on or after the cutoff date are removed from the ledger, while historical records are preserved.
4. If "Delete" is chosen:
   - User confirms permanent deletion; the rule and all its generated transactions (past and future) are removed.
5. A 6-second undo notification appears; if user clicks "Undo", the rule and its occurrences are restored → **END**.
6. If the 6-second timer expires without user interaction, the change is permanently committed to the database.

## Flow I: Adding and Configuring Accounts

**When it happens:** User sets up a new depository account (Checking, Savings, Cash) or credit card.

**Goal:** Establish an account with custom colors, opening balance pockets in supported currencies, and billing rules.

**Implementation:** `AccountsPage.openAddAccount` → `AccountFormDialog.handleSubmit` → `SettingsContext.dispatch(account/add)` → `SqliteRepository.createAccount`

1. User navigates to `/accounts` and clicks "Add account".
2. The account dialog prompts for account name, account kind (`Checking`, `Savings`, `Cash`), initials, color accent, and enabled currencies (`USD`, `BRL`).
3. User enters initial opening balance for each enabled currency pocket and the account opening date.
4. If a credit card is attached to the account, the dialog prompts for credit card details:
   - User specifies card name, statement closing day (1–31), payment due day (1–31), and total credit limit.
5. If required fields are missing, the account name duplicates an existing account, or closing/due days are out of range, inline validation errors are displayed → **END**.
6. User clicks "Add account"; local state updates and saves the record to database.
7. The new account tile appears in `/accounts` with current balance, initials badge, and action menu.

## Flow J: Archiving and Restoring Accounts

**When it happens:** User closes an external bank account or stops using a credit card, but wants to keep historical records intact.

**Goal:** Hide inactive accounts from active dropdowns and transaction forms while preserving past financial ledgers.

**Implementation:** `AccountsPage.openArchive` → `ArchiveAccountDialog.confirm` → `SettingsContext.dispatch(account/archive)` → `SqliteRepository.archiveAccount` → `RestoreAccountDialog.confirm`

1. User navigates to `/accounts`, clicks the account action menu, and selects "Archive".
2. The archive confirmation dialog opens:
   - If the account is the last remaining active account, a warning explains that at least one active account must remain and blocks archiving → **END**.
   - If active recurring rules exist for this account, a warning notifies the user that they will be automatically canceled.
3. User confirms archive; active recurring rules linked to the account are canceled effective today and account status updates to `archived`.
4. The account is removed from the active accounts grid and hidden from transaction form selectors.
5. To restore, user clicks "Show Archived" on the Accounts page.
6. User clicks "Unarchive" on the archived account tile and confirms in the restore dialog.
7. The account status returns to `active` and re-appears across all active account pickers.

## Flow K: Deleting Accounts and Deletion Safeguards

**When it happens:** User wants to delete a mistakenly created empty account, or attempts to delete an account with existing transaction history.

**Goal:** Prevent accidental data corruption by blocking deletion of accounts with transactions while permitting clean removal of empty accounts.

**Implementation:** `AccountsPage.openDelete` → `DeleteAccountDialog.render` → `SettingsContext.dispatch(account/remove)` → `SqliteRepository.deleteAccount`

1. User clicks "Delete" on an account tile in `/accounts`.
2. The delete dialog checks for safeguards:
   - **If it is the last active account**: The delete button is hidden and an inline warning informs the user that the last active account cannot be deleted → **END**.
   - **If transactions exist**: Permanent deletion is blocked. An inline alert informs the user that the account contains transactions and must be archived instead. An "Archive account instead" button is provided → Proceed to **Flow J: Archiving and Restoring Accounts**.
   - **If zero transactions exist**: The "Delete account" button is enabled.
3. For an empty account, user clicks "Delete account".
4. The account is deleted from database.
5. The account is removed from the grid and an undo notification is displayed.

## Flow L: Tracking Credit Card Billing Cycles and Statement Balances

**When it happens:** User reviews monthly credit card obligations, statement closing dates, and credit utilization.

**Goal:** Review open and closed billing cycles, invoice payment statuses, and limit usage based on configured closing and due days.

**Implementation:** `AccountsPage.selectCard` → `AccountDetailPage.render` → `cardStatements.buildStatements` → `cardStatements.getCardUsage` → `CardStatementsPanel.render`

1. User navigates to `/accounts` and clicks a credit card account tile.
2. The account detail page opens, displaying the credit card summary, available credit limit, and the credit card bills panel.
3. The Limit Usage section displays current spent credit against the total credit limit (e.g., "$1,200.00 / $5,000.00") with a visual progress bar.
4. The Credit Card Bills section provides a billing cycle selector to browse statements across cycles.
5. For the selected billing cycle, the panel displays:
   - Statement month and year.
   - Closing date and payment due date (e.g., "Closes: Oct 20, Due: Nov 05").
   - Total statement balance and status badge (`open`, `closed`, or `paid`).
   - Itemized purchase breakdown listing each transaction's date, description, and amount (with refunds or payments highlighted in green).
6. User reviews statement items and upcoming payment obligations to plan cash flow settlements.

## Flow M: Setting Budget Goals and Category Allocations

**When it happens:** User plans monthly spending limits by configuring reference income and category budget allocations.

**Goal:** Maintain realistic spending targets using normalized percentage allocations or fixed monetary limits.

**Implementation:** `GoalsPage.adjustGoals` → `GoalCategoryAllocationSliders.update` → `SettingsContext.dispatch(goals/updateAllocations)` → `SqliteRepository.saveGoalCategories`

1. User navigates to `/goals` and clicks "Adjust goals" (or "Setup goals").
2. User enters estimated monthly reference income (e.g., $5,000.00).
3. User adjusts percentage allocation sliders for budget categories (e.g., Needs 50%, Wants 30%, Savings 20%) or switches budget mode to fixed currency amounts:
   - Fixed budget amounts auto-calculate based on reference income.
   - If the total allocation across categories does not equal 100%, an inline warning is displayed and saving is disabled → **END**.
4. User clicks "Save goals"; the new budget configuration is persisted to database.
5. The `/goals` Budget Overview updates with spending progress bars and donut distribution visualizers.

## Flow N: Reviewing Financial Alerts and Smart Insights

**When it happens:** Month-to-date spending approaches a budget limit, a card bill approaches its due date, or cash flow turns negative.

**Goal:** Surface actionable, non-intrusive warnings across Top Navigation and Dashboard widgets from a single heuristic source of truth.

**Implementation:** `useFinancialAlerts` → `NotificationsContext.notify` → `NotificationCenter.render` → `SmartInsightsContent.render`

1. As user logs expenses, the alert engine continuously monitors financial activity:
   - Spending reaches warning threshold (default 85%, configurable 50%–99%): Warning alert generated.
   - Spending reaches or exceeds 100%, exceeds budget across 2–3 consecutive months, or spikes above the 3-month rolling average: Critical overspending, streak, or spike alert generated.
   - Open credit card statement due within 7 days (warning) or within 3 days (critical): Due date reminder generated.
   - Monthly savings rate reaches $\ge 25\%$ (milestone) or net cash flow drops below zero (deficit): Cash flow alert generated.
2. The Top Navigation bell icon displays an unread indicator badge.
3. User clicks the bell icon; the Notification Center popover opens displaying prioritized alerts with category progress and direct action links.
4. Alternatively, user inspects the "Smart Insights" panel on `/dashboard` to view identical alert signals.
5. User clicks an alert item to navigate to the corresponding page or dismisses the alert.

## Flow O: Finding Historical Transactions via Global Search

**When it happens:** User wants to quickly locate accounts or past transactions by description.

**Goal:** Quickly locate accounts or past transactions by searching descriptions, with instant matching and direct access to editing.

**Implementation:** `GlobalSearch.handleInput` → `useTransactionSearch.search` → `SqliteRepository.searchTransactions` → `GlobalSearch.handleSelect` → `useTransactionActions.openEditDialog`

1. User presses `/` or `Ctrl+K` from any screen; focus immediately moves to the global search input.
2. User types a query (e.g., `coffee`):
   - If the query is shorter than 2 characters, a minimum-character hint is shown → **END**.
3. After a short debounce, the search popover displays matching accounts and transactions in real time with search terms highlighted.
4. If user selects a matching account, the application navigates directly to that account's detail view → **END**.
5. If user selects a transaction match or presses `Enter`, the application navigates to `/transactions?q=coffee` filtered across all history, where the user can open any matching transaction for review or editing → Proceed to **Flow B: Editing an Existing Transaction**.

## Flow P: Creating a Custom Transaction Category

**When it happens:** User wants to track spending or income under a personalized category (e.g., "Consulting", "Fitness", "Gaming").

**Goal:** Add a custom category with personalized icon and color styling, making it immediately available across all transaction forms.

**Implementation:** `SettingsPage.openAddType` → `TransactionTypeDialog.saveType` → `SettingsContext.dispatch(type/add)` → `SqliteRepository.createTransactionType`

1. User navigates to `/settings` and selects the "Transaction Types" tab.
2. Clicks "Add expense type" (or income type); a dialog opens to select name, icon, color token, and optional linked budget goal.
3. If the category name is empty or duplicates an existing category in the same direction, an inline error message blocks submission → **END**.
4. User saves the category; it immediately becomes selectable across all transaction forms.

## Flow Q: Deleting a Category with Mandatory Reassignment

**When it happens:** User wants to remove an obsolete transaction category that may have historical transactions assigned to it.

**Goal:** Allow category customization while preventing broken references by enforcing mandatory reassignment before category deletion.

**Implementation:** `SettingsPage.openDeleteType` → `DeleteTypeDialog.reassignAndDelete` → `SettingsContext.dispatch(type/remove)` → `SqliteRepository.reassignAndDeleteTransactionType`

1. User navigates to `/settings` → "Transaction Types" tab and clicks delete on an existing category.
2. The deletion dialog opens, disabling the delete button and indicating how many transactions currently use this category (if it is the last remaining category in that direction, deletion is blocked → **END**).
3. User selects a replacement category from the dropdown (filtered to the same cash flow direction).
4. Once a replacement is selected, "Reassign and Delete" becomes enabled.
5. User confirms; database atomically reassigns all referencing transactions and recurring rules to the replacement category and deletes the old category configuration.
6. Note: Core system categories (e.g., `transfer`) cannot be deleted or reassigned.

## Flow R: Creating a Custom Payment Method

**When it happens:** User wants to register a new payment channel (e.g., "Digital Wallet", "PIX", "Direct Debit").

**Goal:** Add a custom payment method with custom iconography, enabling it for compatible depository or credit accounts.

**Implementation:** `SettingsPage.openAddMethod` → `PaymentMethodDialog.saveMethod` → `SettingsContext.dispatch(method/add)` → `SqliteRepository.createPaymentMethod`

1. User navigates to `/settings` and selects the "Payment Methods" tab.
2. User clicks "Add payment method".
3. A dialog opens prompting for payment method name and an icon.
4. If the name is empty or duplicates an existing payment method, an inline error blocks submission → **END**.
5. User enters details and clicks "Add method".
6. The payment method is saved and appears in the payment methods list, becoming available for compatible accounts.

## Flow S: Deleting a Payment Method with Mandatory Reassignment

**When it happens:** User wants to remove a payment method that may have recorded transactions associated with it.

**Goal:** Prevent orphaned records by enforcing mandatory transaction reassignment before deleting payment methods.

**Implementation:** `SettingsPage.openDeleteMethod` → `DeleteMethodDialog.reassignAndDelete` → `SettingsContext.dispatch(method/remove)` → `SqliteRepository.reassignAndDeletePaymentMethod`

1. User navigates to `/settings` → "Payment Methods" tab and clicks delete next to a payment method.
2. The deletion dialog checks for referencing transactions:
   - If transactions use this payment method, the confirm button is disabled and the dialog indicates the count of affected transactions.
   - A replacement payment method selector is displayed, listing available active payment methods.
3. User selects an active replacement payment method from the dropdown.
4. User clicks "Reassign and Delete"; all referencing transactions and recurring rules are atomically updated to the replacement method in the database.
5. Note: Core system payment methods (`cash`, `credit-card`) are protected and cannot be deleted.

## Flow T: Switching Display Language and Visual Theme

**When it happens:** User customizes language preferences (English or Portuguese), display currency (`USD` or `BRL`), or toggles between System, Dark, and Light mode.

**Goal:** Update the user interface immediately with zero hardcoded text regressions and persist preferences across restarts.

**Implementation:** `PreferencesPanel.handleLanguageChange` → `I18nContext.setLocale` → `TopNavigation.handleThemeToggle` → `useTheme.setTheme`

1. User navigates to `/settings` → "Preferences" tab.
2. User selects preferred language (English `en-US` or Portuguese `pt-BR`) and preferred currency (`USD` or `BRL`).
3. UI strings re-render dynamically without requiring a page reload.
4. Currency and date formatters adjust to localized formats.
5. User clicks the theme switcher in the top navigation bar (or Preferences) to select System, Dark, or Light mode.
6. Theme colors update immediately, adjusting glassmorphism backgrounds and neon palette borders.
7. Preferences are saved to local storage and persist across sessions and desktop app restarts.

## Flow U: Resetting Workspace Data to Factory Defaults (Development Mode)

**When it happens:** A developer or tester needs to purge all local accounts, transactions, and categories to restore clean production defaults or pre-populated developer fixtures.

**Goal:** Atomically reset database tables and rehydrate client state with clean defaults, avoiding residual cross-contamination.

**Implementation:** `PreferencesPanel.handleReset` → `FinanceContext.resetWorkspace` → `SqliteRepository.resetSettings` → `seedDatabase.resetAndSeedWorkspace`

1. User navigates to `/settings` → "Preferences" tab while running the application in development mode. Note: This section is omitted in production environments to protect user data from accidental erasure.
2. In the "Danger Zone" section, user clicks "Reset to Factory Defaults" (or "Reset to Dev Fixtures").
3. A confirmation dialog opens with an explicit warning regarding permanent data erasure.
4. User confirms; the reset action is dispatched to the server.
5. Database truncates transactions, rules, and custom accounts, and seeds clean defaults.
6. The newly seeded snapshot rehydrates client state immediately without requiring a full browser refresh.
7. Application is ready for new use with the restored dataset.

## Flow V: Checking for Application Updates and Configuring Release Channel (Desktop Mode)

**When it happens:** The desktop application starts up, or the user manually checks for updates or switches their release channel preference in Settings.

**Goal:** Notify the desktop user when a newer version of Finance Tracker is available on GitHub Releases according to their chosen stability channel (Full Releases Only vs. Include Pre-releases).

**Implementation:** `AppUpdatesProvider.initStartupCheck` → `AppUpdatesContext.checkForUpdates` → `updates.checkForAppUpdates` → `updates.selectLatestRelease` → `NotificationsContext.notify` → `AppUpdatesCard.render`

1. On desktop application startup, the update checker queries for new releases in the background using the user's saved release channel preference (defaulting to "Full Releases Only"). Note: Both the background check and the "Application Updates" card are omitted in the web version:
   - If the network is offline or the release server is unreachable during startup, the check fails silently without interrupting the user.
   - If a newer release matching the channel is found, a notification with a "View Release" action appears and is recorded in the Notification Center Activity tab.
2. User navigates to `/settings` → "Preferences" tab and locates the "Application Updates" card.
3. Under "Release Channel", user chooses between "Full Releases Only" (default, ignoring pre-release versions) or "Include Pre-releases":
   - Switching the channel saves the preference immediately and re-evaluates available releases against the selected channel.
4. User clicks "Check for Updates":
   - If a newer version is available, the status badge updates to show the new version alongside a "View & Download on GitHub" button and displays an update notification → **END**.
   - If the current version is already the latest, the status badge displays "Up to date" and confirms with a notification → **END**.
   - If the manual check fails due to network disconnection or service error, an inline error message and error notification are displayed → **END**.

## Flow W: Navigating and Collapsing the Application Sidebar

**When it happens:** User navigates between application sections or toggles the navigation sidebar using the bottom toggle button or the `Ctrl+B` / `⌘B` keyboard shortcut.

**Goal:** Switch between application views while allowing desktop users to reclaim screen space with an icon-only sidebar and keeping mobile navigation accessible via a slide-over drawer.

**Implementation:** `SidebarContext.SidebarProvider` → `Sidebar.render` / `MobileNavDrawer.render` → `AppLayout.main`

1. On desktop, the navigation sidebar appears expanded by default, displaying icons, page labels, and a bottom toggle button with the `Ctrl+B` / `⌘B` shortcut hint.
2. User clicks the "Collapse sidebar" button at the bottom of the sidebar or presses `Ctrl+B` / `⌘B`:
   - The sidebar collapses into an icon-only rail, expanding the main content area and showing page name tooltips when hovering over each icon.
   - The collapsed preference is saved automatically and persists across sessions.
3. User clicks the "Expand sidebar" button or presses `Ctrl+B` / `⌘B` again to restore the full sidebar with page labels.
4. On smaller screens (tablet and mobile), navigation is accessed through the top-left menu button or by pressing `Ctrl+B` / `⌘B`, which opens and closes a slide-over navigation drawer; selecting a page automatically closes the drawer.

## Exceptional & Edge Flows

- **Reconnecting After Offline Disconnection & Sync Recovery**: When network connectivity drops or the server returns errors during mutations, the application catches the error, coalesces duplicate notifications to prevent spamming, and renders an offline banner. The app continues in cached mode until network restores, re-fetching a fresh 90-day workspace snapshot.
- **Debounced Remote Log Ingestion**: When unhandled exceptions or client errors occur, the client logger buffers events and debounces forwarding to the server logging endpoint. If the remote logging endpoint fails or is unreachable, the client catches the error silently to prevent recursive crash-reporting loops.
- **Rapid Search Query Cancellation**: When users rapidly type into the search bar, preceding in-flight search requests are immediately aborted, preventing stale responses from overwriting newer search results.
- **Corrupted LocalStorage Recovery**: When reading preferences, activity logs, or alert dismissal states from browser storage, all parsing is guarded against errors. If corrupted data is detected, it resets to safe production defaults and logs a warning without throwing fatal initialization exceptions.
- **Month-End Date Clamping in Leap Years**: When recurring rules or installment purchases fall on the 29th, 30th, or 31st, month addition dynamically verifies days in the target month (e.g., Jan 31 $\rightarrow$ Feb 28 on standard years, Feb 29 on leap years, Mar 31, Apr 30), preventing illegal calendar dates.
- **Credit Card Billing Rollover**: When a credit card's payment due day is numerically less than or equal to its statement closing day (e.g., closing day 20, due day 5), the statement closing engine automatically rolls the payment due date into the following calendar month, preventing due dates from being recorded prior to invoice closing dates.
- **Pending Undo Flush on Page Unload**: If a user deletes a transaction and navigates away or closes the browser tab before the 6-second undo timer elapses, the page unload listener immediately cancels the timer and synchronously commits the deferred deletion so changes are not lost.
- **System Entity Immutability Guard**: If a user or API consumer attempts to dispatch a delete action targeting protected system records (`transfer` category, `cash` payment method, or `credit-card` method), the validation layer rejects the operation.
- **Live Rate Fallback on Fetch Failure**: When the live exchange rate fetcher fails due to timeout or network disconnection, the application retains the last confirmed exchange rate or manual override, annotating the rate status badge with an error notice without interrupting user transactions.
