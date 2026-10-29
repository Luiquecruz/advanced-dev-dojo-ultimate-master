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
  const lines: string[] = [];
  if (message.event) {
    lines.push(`event: ${message.event}`);
  }
  message.data.split('\n').forEach((line) => lines.push(`data: ${line}`));
  if (message.id) {
    lines.push(`id: ${message.id}`);
  }
  return `${lines.join('\n')}\n\n`;
}

export function createApp(options: AppOptions) {
  const app = new Hono();

  app.get('/jobs/:id/events', (c) => {
    const jobId = c.req.param('id');
    const job = jobs.get(jobId);
    if (!job) {
      return c.json({ error: 'Job not found' }, 404);
    }
    const lastEventId = Number(c.req.header('Last-Event-ID') ?? -1);
    return streamSSE(c, async (stream) => {
      for (const [index, percent] of job.steps.entries()) {
        if (index <= lastEventId) {
          continue;
        }
        await stream.writeSSE({ event: 'progress', id: String(index), data: JSON.stringify({ percent }) });
        await options.wait(options.intervalMs);
      }
      await stream.writeSSE({ event: 'done', data: JSON.stringify({ jobId }) });
    });
  });

  return app;
}

export const app = createApp({ wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)), intervalMs: 500 });
