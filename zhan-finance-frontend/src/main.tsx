import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './index.css';
import '@/shared/i18n/i18n';
import { App } from '@/app/App';
import { ToastProvider } from '@/shared/ui/Toast/ToastContext';
import { initVitePreloadErrorRecovery } from '@/shared/lib/react/chunkRecovery';

// Инициализация Уровня 1: перехват vite:preloadError до монтирования дерева приложения
initVitePreloadErrorRecovery();

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>
);