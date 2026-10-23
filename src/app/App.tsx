import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { TopNavigation } from '@/layout/TopNavigation';
import { Sidebar } from '@/layout/Sidebar';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { TransactionsPage } from '@/features/transactions/TransactionsPage';
import { AccountsPage } from '@/features/accounts/AccountsPage';
import { AccountDetailPage } from '@/features/accounts/AccountDetailPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { GoalsPage } from '@/features/goals/GoalsPage';
import { Toaster } from '@/components/primitives/sonner';
import { NotificationsProvider } from '@/state/NotificationsContext';
import { SettingsProvider } from '@/state/SettingsContext';
import { FinanceProvider } from '@/state/FinanceContext';
import { I18nProvider } from '@/i18n';
import { OfflineBanner } from '@/components/shared/OfflineBanner';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { ErrorFallback } from '@/components/shared/ErrorFallback';

function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNavigation />
      <Sidebar />

      <main className="ml-64 mt-16 relative">
        <OfflineBanner />
        <div className="p-8">
          <ErrorBoundary
            key={location.pathname}
            fallback={(error, reset) => <ErrorFallback error={error} resetErrorBoundary={reset} />}
          >
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/accounts/:accountId" element={<AccountDetailPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <NotificationsProvider>
          <SettingsProvider>
            <FinanceProvider>
              <AppLayout />
              <Toaster position="bottom-right" visibleToasts={3} closeButton />
            </FinanceProvider>
          </SettingsProvider>
        </NotificationsProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}
