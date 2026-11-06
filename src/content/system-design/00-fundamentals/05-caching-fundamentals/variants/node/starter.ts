export interface CacheStats {
  hits: number;
  misses: number;
  hitRatio: number;
}

export interface ReadThroughCache<V> {
  get(key: string): Promise<V>;
  invalidate(key: string): void;
  stats(): CacheStats;
}

export interface CacheOptions<V> {
  load: (key: string) => Promise<V>;
  ttlMs: number;
  now: () => number;
}

export function createReadThroughCache<V>(options: CacheOptions<V>): ReadThroughCache<V> {
  // TODO: store when each entry expires, so the source of truth is read again after ttlMs
  const entries = new Map<string, V>();
  let hits = 0;
  let misses = 0;

  return {
    async get(key) {
      if (entries.has(key)) {
        hits++;
        return entries.get(key) as V;
      }
      misses++;
      const value = await options.load(key);
      entries.set(key, value);
      return value;
    },
    invalidate(key) {
      // TODO: forget the cached value so the next get loads it again
    },
    stats() {
      // TODO: hitRatio is hits / (hits + misses), or 0 before any lookup
      return { hits, misses, hitRatio: 0 };
    },
  };
}

async function main() {
  let clock = 0;
  const database = new Map([['product:1', 'Keyboard 120']]);
  const cache = createReadThroughCache({
    load: async (key: string) => database.get(key) ?? 'not found',
    ttlMs: 60_000,
    now: () => clock,
  });
  console.log(await cache.get('product:1'));
  console.log(await cache.get('product:1'));
  database.set('product:1', 'Keyboard 99');
  clock = 60_000;
  console.log(await cache.get('product:1'));
  console.log(cache.stats());
}

main();
