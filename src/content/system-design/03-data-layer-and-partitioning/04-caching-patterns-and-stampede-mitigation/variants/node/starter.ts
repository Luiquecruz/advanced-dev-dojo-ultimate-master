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

  return {
    async get(key) {
      const entry = entries.get(key);
      if (entry && options.now() < entry.expiresAt) {
        return entry.value;
      }
      // TODO: share one in-flight load per key between concurrent misses, and forget it when it settles
      const value = await options.load(key);
      // TODO: add Math.floor(random() * jitterMs) to the expiry
      entries.set(key, { value, expiresAt: options.now() + options.ttlMs });
      return value;
    },
    invalidate(key) {
      // TODO: delete the entry and forget the in-flight load of this key
    },
  };
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
