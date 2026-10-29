Build an in-memory job queue that shows the mechanics of BullMQ-style workers.

```ts
interface Job<T> { id: number; data: T; attempts: number; error?: string }

new JobQueue<T>(handler: (data: T, job: Job<T>) => Promise<void>, options?: {
  concurrency?: number;                     // default 1
  maxAttempts?: number;                     // default 3
  retryDelay?: (attempt: number) => number; // milliseconds before the next attempt, default () => 0
})
```

| Member | Behavior |
| --- | --- |
| `add(data): number` | creates a job with ids `1, 2, 3...` and `attempts: 0`, queues it, starts processing right away when a slot is free, returns the id |
| `completed: Job<T>[]` | jobs that succeeded, in completion order |
| `failed: Job<T>[]` | dead-letter list: jobs that failed `maxAttempts` times, in order, with `error` set to the last error's `message` |
| `onIdle(): Promise<void>` | resolves when nothing is running, waiting or scheduled for a retry (immediately if already idle) |

Rules:

1. Jobs start in FIFO order and **never more than `concurrency`** handlers run at the same time.
2. Increment `job.attempts` right before each call to the handler (so the handler can read it).
3. When the handler rejects and `attempts < maxAttempts`, schedule the job again after `retryDelay(attempts)` ms with `setTimeout`. While it waits it must **not** occupy a slot: other jobs keep running. When it is due, it goes to the back of the queue.
4. When the handler rejects on the last attempt, push the job to `failed`.
