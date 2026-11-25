import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { TopNavigation } from '@/layout/TopNavigation';
import { Sidebar } from '@/layout/Sidebar';
import { SidebarProvider, useSidebar } from '@/layout/SidebarContext';
import { ElectronThemeSync } from '@/layout/ElectronThemeSync';
import { QuitConfirmationDialog } from '@/layout/QuitConfirmationDialog';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { TransactionsPage } from '@/features/transactions/TransactionsPage';
import { AccountsPage } from '@/features/accounts/AccountsPage';
import { AccountDetailPage } from '@/features/accounts/AccountDetailPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { GoalsPage } from '@/features/goals/GoalsPage';
import { Toaster } from '@/components/primitives/sonner';
import { NotificationsProvider } from '@/state/NotificationsContext';
import { AppUpdatesProvider } from '@/state/AppUpdatesContext';
import { SettingsProvider } from '@/state/SettingsContext';
import { FinanceProvider } from '@/state/FinanceContext';
import { I18nProvider } from '@/i18n';
import { OfflineBanner } from '@/components/shared/OfflineBanner';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { ErrorFallback } from '@/components/shared/ErrorFallback';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';

const routerLogger = logger.child('Router');

function NotFoundRedirect() {
  const location = useLocation();
  useEffect(() => {
    routerLogger.warn('Unrecognized route, redirecting to /dashboard:', location.pathname);
  }, [location.pathname]);
  return <Navigate to="/dashboard" replace />;
}

function AppLayout() {
  const location = useLocation();
  const { collapsed } = useSidebar();

  useEffect(() => {
    routerLogger.debug('Navigated to route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ElectronThemeSync />
      <QuitConfirmationDialog />
      <TopNavigation />
      <Sidebar />

      <main
        className={cn(
          'pt-16 relative min-w-0 transition-[margin] duration-300 ease-in-out',
          collapsed ? 'lg:ml-20' : 'lg:ml-64',
        )}
      >
        <OfflineBanner />
        <div className="@container/main mx-auto w-full max-w-screen-2xl p-4 sm:p-6 lg:p-8">
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
              <Route path="*" element={<NotFoundRedirect />} />
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
          <AppUpdatesProvider>
            <SettingsProvider>
              <FinanceProvider>
                <SidebarProvider>
                  <AppLayout />
                </SidebarProvider>
                <Toaster position="bottom-right" visibleToasts={3} closeButton />
              </FinanceProvider>
            </SettingsProvider>
          </AppUpdatesProvider>
        </NotificationsProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}
