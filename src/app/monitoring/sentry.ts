import * as Sentry from '@sentry/react';
import type { RootOptions } from 'react-dom/client';

export function initSentry(): RootOptions | undefined {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    return undefined;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1,
  });

  return {
    onUncaughtError: Sentry.reactErrorHandler(),
    onCaughtError: Sentry.reactErrorHandler(),
    onRecoverableError: Sentry.reactErrorHandler(),
  };
}
