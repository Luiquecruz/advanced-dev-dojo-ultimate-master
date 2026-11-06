import * as Sentry from '@sentry/react';

type Tags = Record<string, string>;

/**
 * Whether error monitoring runs in this build (a DSN was set and the SDK started).
 */
export function isMonitoringEnabled(): boolean {
  return Sentry.isEnabled();
}

/**
 * Tags every later event with these values; `undefined` clears a tag.
 */
export function setMonitoringTags(tags: Record<string, string | undefined>): void {
  Sentry.setTags(tags);
}

/**
 * Reports a platform problem that threw nothing (a runtime that did not start, a lost WebGL context). The title groups the reports,
 * so it stays stable; what changes between reports goes in `detail`.
 */
export function reportProblem(title: string, level: 'error' | 'warning', tags: Tags, detail?: string): void {
  Sentry.captureMessage(title, { level, tags, contexts: detail === undefined ? undefined : { problem: { detail } } });
}

/**
 * Runs `task` inside a performance span named `name`.
 */
export function measure<T>(name: string, op: string, attributes: Tags, task: () => Promise<T>): Promise<T> {
  return Sentry.startSpan({ name, op, attributes }, task);
}

/**
 * Records a span that already ended, timed with `Date.now()` values, as its own transaction.
 */
export function recordSpan(name: string, op: string, attributes: Tags, startedAt: number, endedAt: number): void {
  Sentry.startInactiveSpan({ name, op, attributes, startTime: new Date(startedAt), parentSpan: null, forceTransaction: true }).end(new Date(endedAt));
}

/**
 * Sends learner feedback with the current tags and, when one is buffered, the session replay.
 */
export function sendFeedback(message: string, email: string): void {
  Sentry.captureFeedback({ message, email: email || undefined, source: 'report-problem' }, { includeReplay: true });
}
