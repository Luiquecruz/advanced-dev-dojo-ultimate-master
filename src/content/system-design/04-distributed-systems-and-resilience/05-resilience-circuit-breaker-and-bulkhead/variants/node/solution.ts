export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  openMs: number;
  now: () => number;
}

export interface CircuitBreaker {
  call<T>(fn: () => Promise<T>): Promise<T>;
  state(): CircuitState;
}

export function createCircuitBreaker({ failureThreshold, openMs, now }: CircuitBreakerOptions): CircuitBreaker {
  let failures = 0;
  let openedAt: number | undefined;
  let trialRunning = false;

  function state(): CircuitState {
    if (openedAt === undefined) {
      return 'closed';
    }
    return now() - openedAt >= openMs ? 'half-open' : 'open';
  }

  function open() {
    openedAt = now();
    failures = 0;
  }

  async function call<T>(fn: () => Promise<T>): Promise<T> {
    const current = state();
    if (current === 'open' || (current === 'half-open' && trialRunning)) {
      throw new Error('circuit open');
    }
    if (current === 'half-open') {
      trialRunning = true;
      try {
        const result = await fn();
        openedAt = undefined;
        return result;
      } catch (error) {
        open();
        throw error;
      } finally {
        trialRunning = false;
      }
    }
    try {
      const result = await fn();
      failures = 0;
      return result;
    } catch (error) {
      failures += 1;
      if (failures >= failureThreshold) {
        open();
      }
      throw error;
    }
  }

  return { call, state };
}

export interface BackoffOptions {
  baseMs: number;
  capMs: number;
  random: () => number;
}

export function backoffDelay(attempt: number, { baseMs, capMs, random }: BackoffOptions): number {
  return Math.floor(random() * Math.min(capMs, baseMs * 2 ** attempt));
}

async function main() {
  let time = 0;
  const breaker = createCircuitBreaker({ failureThreshold: 2, openMs: 1_000, now: () => time });
  const failing = () => Promise.reject(new Error('timeout'));
  for (let attempt = 0; attempt < 3; attempt++) {
    await breaker.call(failing).catch((error: Error) => console.log(attempt, error.message, breaker.state()));
  }
  time = 1_000;
  console.log(breaker.state(), await breaker.call(() => Promise.resolve('recovered')), breaker.state());
  console.log([0, 1, 2, 3, 4, 5].map((attempt) => backoffDelay(attempt, { baseMs: 100, capMs: 2_000, random: () => 0.5 })));
}

main();
