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
    while (this.running < this.concurrency && this.head < this.waiting.length) {
      const job = this.waiting[this.head++];
      this.run(job);
    }
    if (this.isIdle()) {
      const waiters = this.idleWaiters;
      this.idleWaiters = [];
      waiters.forEach((resolve) => resolve());
    }
  }

  private async run(job: Job<T>): Promise<void> {
    this.running++;
    job.attempts++;
    try {
      await this.handler(job.data, job);
      delete job.error;
      this.completed.push(job);
    } catch (error) {
      job.error = error instanceof Error ? error.message : String(error);
      if (job.attempts < this.maxAttempts) {
        this.scheduled++;
        setTimeout(() => {
          this.scheduled--;
          this.waiting.push(job);
          this.drain();
        }, this.retryDelay(job.attempts));
      } else {
        this.failed.push(job);
      }
    } finally {
      this.running--;
      this.drain();
    }
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
  await queue.onIdle();
  console.log('Dead letters:', queue.failed);
}

main();
