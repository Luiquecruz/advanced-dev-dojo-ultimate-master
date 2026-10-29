import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

export interface SSEMessage {
  event?: string;
  id?: string;
  data: string;
}

export interface AppOptions {
  wait: (ms: number) => Promise<void>;
  intervalMs: number;
}

export const jobs = new Map<string, { steps: number[] }>([
  ['report-1', { steps: [25, 50, 75, 100] }],
  ['export-7', { steps: [50, 100] }],
]);

export function formatSSE(message: SSEMessage): string {
  // TODO: event line, one data line per line of data, id line, then a blank line
  return '';
}

export function createApp(options: AppOptions) {
  const app = new Hono();

  app.get('/jobs/:id/events', (c) => {
    // TODO: 404 JSON for unknown jobs, then streamSSE with progress events, Last-Event-ID resume and a final done event
    return c.json({ error: 'Not implemented' }, 501);
  });

  return app;
}

export const app = createApp({ wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)), intervalMs: 500 });
