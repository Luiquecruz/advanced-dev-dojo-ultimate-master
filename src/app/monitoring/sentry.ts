import * as Sentry from '@sentry/react';
import type { RootOptions } from 'react-dom/client';
import { onEngineEvent, type EngineEvent } from '@/engines/shared/engineEvents';
import { recordSpan, reportProblem } from '@/shared/monitoring/monitoring';
import { environmentForHost, routeTransactionName } from './context';

const ENGINE_LABELS = { python: 'Python', csharp: 'C#' } as const;

const STAGE_TITLES = {
  boot: 'runtime did not start',
  snapshot: 'boot snapshot failed',
  protocol: 'worker report did not match the tests',
} as const;

const REPLAY_START_DELAY_MS = 2000;

function reportEngineEvent(event: EngineEvent): void {
  if (event.type === 'boot') {
    recordSpan(`${ENGINE_LABELS[event.engine]} runtime boot`, 'engine.boot', { engine: event.engine }, event.startedAt, event.endedAt);
    return;
  }
  const title = `${ENGINE_LABELS[event.engine]} ${STAGE_TITLES[event.stage]}`;
  reportProblem(title, event.stage === 'boot' ? 'error' : 'warning', { engine: event.engine, stage: event.stage }, event.message);
}

function startReplayWhenIdle(): void {
  const start = () =>
    void import('@sentry/replay').then(({ replayIntegration }) => {
      Sentry.addIntegration(replayIntegration());
    });
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(start, { timeout: REPLAY_START_DELAY_MS });
    return;
  }
  setTimeout(start, REPLAY_START_DELAY_MS);
}

/**
 * Starts Sentry in the app window when the build has a DSN and returns the React root error handlers. Production builds only, so
 * a dev server never spends the quota; `vite preview` of a build reports as `development`.
 */
export function initSentry(): RootOptions | undefined {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || !import.meta.env.PROD) {
    return undefined;
  }

  const basename = import.meta.env.BASE_URL;
  Sentry.init({
    dsn,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    environment: environmentForHost(location.hostname),
    tunnel: `${basename}signal`,
    integrations: [
      Sentry.browserTracingIntegration({
        beforeStartSpan: (options) => ({
          ...options,
          name: routeTransactionName(options.name, basename),
          attributes: { ...options.attributes, 'sentry.source': 'route' },
        }),
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1,
    allowUrls: [location.origin],
    denyUrls: [/^(?:chrome|moz|safari(?:-web)?)-extension:\/\//],
    ignoreErrors: [/^Canceled(?:: Canceled)?$/, /^ResizeObserver loop/],
  });

  onEngineEvent(reportEngineEvent);
  startReplayWhenIdle();

  return {
    onUncaughtError: Sentry.reactErrorHandler(),
    onCaughtError: Sentry.reactErrorHandler(),
    onRecoverableError: Sentry.reactErrorHandler(),
  };
}
