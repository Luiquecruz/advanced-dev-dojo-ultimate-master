export class HttpError extends Error {
  constructor(
    readonly status: number,
    message = `HTTP ${status}`,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export interface RetryOptions {
  retries: number;
  baseMs: number;
  maxMs: number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  shouldRetry?: (error: unknown) => boolean;
}

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export function isRetryable(error: unknown): boolean {
  if (error instanceof HttpError) {
    return RETRYABLE_STATUSES.has(error.status);
  }
  return error instanceof TypeError;
}

export function backoffDelay(attempt: number, baseMs: number, maxMs: number, random: () => number = Math.random): number {
  return random() * Math.min(maxMs, baseMs * 2 ** attempt);
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function retry<T>(fn: (attempt: number) => Promise<T>, options: RetryOptions): Promise<T> {
  const { retries, baseMs, maxMs, sleep = wait, random = Math.random, shouldRetry = isRetryable } = options;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      if (attempt >= retries || !shouldRetry(error)) {
        throw error;
      }
      await sleep(backoffDelay(attempt, baseMs, maxMs, random));
    }
  }
}

async function main() {
  let calls = 0;
  const result = await retry(
    async (attempt) => {
      calls++;
      console.log(`attempt ${attempt}`);
      if (calls < 3) {
        throw new HttpError(503);
      }
      return 'payload';
    },
    { retries: 4, baseMs: 20, maxMs: 200 },
  );
  console.log(`${result} after ${calls} calls`);
}

main().catch((error) => console.error(`failed: ${error.message}`));
