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

interface Entry<V> {
  value: V;
  expiresAt: number;
}

export function createReadThroughCache<V>(options: CacheOptions<V>): ReadThroughCache<V> {
  const entries = new Map<string, Entry<V>>();
  let hits = 0;
  let misses = 0;

  return {
    async get(key) {
      const entry = entries.get(key);
      if (entry && options.now() < entry.expiresAt) {
        hits++;
        return entry.value;
      }
      misses++;
      entries.delete(key);
      const value = await options.load(key);
      entries.set(key, { value, expiresAt: options.now() + options.ttlMs });
      return value;
    },
    invalidate(key) {
      entries.delete(key);
    },
    stats() {
      const lookups = hits + misses;
      return { hits, misses, hitRatio: lookups === 0 ? 0 : hits / lookups };
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
