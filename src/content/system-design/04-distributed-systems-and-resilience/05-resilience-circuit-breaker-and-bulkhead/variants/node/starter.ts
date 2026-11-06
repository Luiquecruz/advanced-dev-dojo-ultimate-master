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

  function state(): CircuitState {
    // TODO: report 'open' while openMs has not passed since the circuit opened, then 'half-open'
    return 'closed';
  }

  async function call<T>(fn: () => Promise<T>): Promise<T> {
    // TODO: while open (or while the half-open trial runs) reject with new Error('circuit open') without calling fn
    // TODO: in half-open, one trial: success closes the circuit, failure opens it again
    try {
      const result = await fn();
      failures = 0;
      return result;
    } catch (error) {
      failures += 1;
      // TODO: open the circuit when failures reaches failureThreshold
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
  // TODO: full jitter: random() times the exponential backoff baseMs * 2 ** attempt, capped at capMs, rounded down
  return baseMs;
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
