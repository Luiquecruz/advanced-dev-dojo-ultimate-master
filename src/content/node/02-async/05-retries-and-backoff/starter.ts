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

export function isRetryable(error: unknown): boolean {
  // TODO: true for HttpError with status 408, 429, 500, 502, 503 or 504, and for TypeError (network failure); false otherwise
  return true;
}

export function backoffDelay(attempt: number, baseMs: number, maxMs: number, random: () => number = Math.random): number {
  // TODO: full jitter: random() times the exponential delay baseMs * 2 ** attempt, capped at maxMs
  return baseMs;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function retry<T>(fn: (attempt: number) => Promise<T>, options: RetryOptions): Promise<T> {
  // TODO: call fn(attempt) until it succeeds; on a retryable error sleep backoffDelay(...) and try again, at most `retries` times
  return fn(0);
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
