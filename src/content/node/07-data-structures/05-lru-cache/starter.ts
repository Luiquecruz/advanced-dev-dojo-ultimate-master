export interface LruOptions<K, V> {
  max: number;
  onEvict?: (key: K, value: V) => void;
}

interface Entry<K, V> {
  key: K;
  value: V;
  prev: Entry<K, V> | null;
  next: Entry<K, V> | null;
}

export class LruCache<K, V> {
  private readonly entries = new Map<K, Entry<K, V>>();
  private head: Entry<K, V> | null = null;
  private tail: Entry<K, V> | null = null;
  private readonly max: number;
  private readonly onEvict?: (key: K, value: V) => void;

  constructor({ max, onEvict }: LruOptions<K, V>) {
    // TODO: reject max < 1 with a RangeError
    this.max = max;
    this.onEvict = onEvict;
  }

  get(key: K): V | undefined {
    // TODO: move a hit to the tail of the list
    return this.entries.get(key)?.value;
  }

  set(key: K, value: V): this {
    // TODO: update or create the entry at the tail; evict the head when size exceeds max
    this.entries.set(key, { key, value, prev: null, next: null });
    return this;
  }

  has(key: K): boolean {
    return this.entries.has(key);
  }

  delete(key: K): boolean {
    // TODO: also unlink the entry from the list
    return this.entries.delete(key);
  }

  get size(): number {
    return this.entries.size;
  }

  keys(): K[] {
    // TODO: walk the list from head to tail
    return [...this.entries.keys()];
  }
}

const responses = new LruCache<string, string>({
  max: 2,
  onEvict: (key) => console.log(`evicted ${key}`),
});
responses.set('/users/1', '{"name":"Ada"}');
responses.set('/users/2', '{"name":"Alan"}');
responses.get('/users/1');
responses.set('/users/3', '{"name":"Grace"}');
console.log(responses.keys());
