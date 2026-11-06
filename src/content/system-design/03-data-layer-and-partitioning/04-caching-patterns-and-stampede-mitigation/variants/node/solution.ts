export interface CacheAsideOptions<V> {
  load: (key: string) => Promise<V>;
  ttlMs: number;
  jitterMs: number;
  now: () => number;
  random: () => number;
}

export interface CacheAside<V> {
  get(key: string): Promise<V>;
  invalidate(key: string): void;
}

interface Entry<V> {
  value: V;
  expiresAt: number;
}

export function createCacheAside<V>(options: CacheAsideOptions<V>): CacheAside<V> {
  const entries = new Map<string, Entry<V>>();
  const inFlight = new Map<string, Promise<V>>();

  function settle(key: string, promise: Promise<V>): boolean {
    if (inFlight.get(key) !== promise) {
      return false;
    }
    inFlight.delete(key);
    return true;
  }

  function get(key: string): Promise<V> {
    const entry = entries.get(key);
    if (entry && options.now() < entry.expiresAt) {
      return Promise.resolve(entry.value);
    }
    const pending = inFlight.get(key);
    if (pending) {
      return pending;
    }
    const promise: Promise<V> = new Promise<V>((resolve) => resolve(options.load(key))).then(
      (value) => {
        if (settle(key, promise)) {
          const jitter = Math.floor(options.random() * options.jitterMs);
          entries.set(key, { value, expiresAt: options.now() + options.ttlMs + jitter });
        }
        return value;
      },
      (error: unknown) => {
        settle(key, promise);
        throw error;
      },
    );
    inFlight.set(key, promise);
    return promise;
  }

  function invalidate(key: string): void {
    entries.delete(key);
    inFlight.delete(key);
  }

  return { get, invalidate };
}

let clock = 0;
const cache = createCacheAside({
  load: async (key: string) => `profile of ${key}`,
  ttlMs: 60000,
  jitterMs: 5000,
  now: () => clock,
  random: Math.random,
});

async function main() {
  const [first, second] = await Promise.all([cache.get('user:1'), cache.get('user:1')]);
  clock += 1000;
  console.log(first, second, await cache.get('user:1'));
}

main();
