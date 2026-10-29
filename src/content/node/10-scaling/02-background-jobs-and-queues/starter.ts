export interface Job<T> {
  id: number;
  data: T;
  attempts: number;
  error?: string;
}

export interface JobQueueOptions {
  concurrency?: number;
  maxAttempts?: number;
  retryDelay?: (attempt: number) => number;
}

export class JobQueue<T> {
  readonly completed: Job<T>[] = [];
  readonly failed: Job<T>[] = [];
  private readonly waiting: Job<T>[] = [];
  private head = 0;
  private running = 0;
  private scheduled = 0;
  private nextId = 1;
  private idleWaiters: Array<() => void> = [];
  private readonly concurrency: number;
  private readonly maxAttempts: number;
  private readonly retryDelay: (attempt: number) => number;

  constructor(
    private readonly handler: (data: T, job: Job<T>) => Promise<void>,
    { concurrency = 1, maxAttempts = 3, retryDelay = () => 0 }: JobQueueOptions = {},
  ) {
    this.concurrency = concurrency;
    this.maxAttempts = maxAttempts;
    this.retryDelay = retryDelay;
  }

  add(data: T): number {
    const job: Job<T> = { id: this.nextId++, data, attempts: 0 };
    this.waiting.push(job);
    this.drain();
    return job.id;
  }

  onIdle(): Promise<void> {
    if (this.isIdle()) {
      return Promise.resolve();
    }
    return new Promise((resolve) => this.idleWaiters.push(resolve));
  }

  private isIdle(): boolean {
    return this.running === 0 && this.scheduled === 0 && this.head === this.waiting.length;
  }

  private drain(): void {
    // TODO: start waiting jobs while fewer than concurrency are running, then resolve idleWaiters when idle
  }

  private async run(job: Job<T>): Promise<void> {
    // TODO: count the attempt, await the handler, then record success, schedule a retry with setTimeout or dead-letter the job
    // TODO: always free the slot and call drain() when the handler settles
  }
}

async function main() {
  const queue = new JobQueue<{ to: string }>(
    async ({ to }, job) => {
      if (to.endsWith('@flaky.dev') && job.attempts < 2) {
        throw new Error('SMTP timeout');
      }
      if (to.endsWith('@invalid')) {
        throw new Error('Mailbox does not exist');
      }
      console.log(`Sent welcome email to ${to} (attempt ${job.attempts})`);
    },
    { concurrency: 2, maxAttempts: 3, retryDelay: (attempt) => 10 * 2 ** attempt },
  );
  ['ada@example.com', 'alan@flaky.dev', 'nobody@invalid', 'grace@example.com'].forEach((to) => queue.add({ to }));
  await Promise.race([queue.onIdle(), new Promise((resolve) => setTimeout(resolve, 200))]);
  console.log('Dead letters:', queue.failed);
}

main();
