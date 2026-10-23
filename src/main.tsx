import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/styles/index.css';
import { ThemeProvider } from 'next-themes';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-2xl font-bold mb-2">Application Error / Erro na Aplicação</h1>
          <p className="text-muted-foreground mb-4 max-w-md">
            A fatal error occurred. Please refresh the page to reload the application. / Ocorreu um erro fatal. Atualize
            a página para recarregar.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded bg-primary text-primary-foreground font-medium text-sm transition"
          >
            Reload Application / Recarregar Aplicação
          </button>
        </div>
      }
    >
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
