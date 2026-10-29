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
    if (max < 1) {
      throw new RangeError('max must be at least 1');
    }
    this.max = max;
    this.onEvict = onEvict;
  }

  get(key: K): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }
    this.unlink(entry);
    this.append(entry);
    return entry.value;
  }

  set(key: K, value: V): this {
    const existing = this.entries.get(key);
    if (existing) {
      existing.value = value;
      this.unlink(existing);
      this.append(existing);
      return this;
    }
    const entry: Entry<K, V> = { key, value, prev: null, next: null };
    this.entries.set(key, entry);
    this.append(entry);
    if (this.entries.size > this.max) {
      const oldest = this.head!;
      this.unlink(oldest);
      this.entries.delete(oldest.key);
      this.onEvict?.(oldest.key, oldest.value);
    }
    return this;
  }

  has(key: K): boolean {
    return this.entries.has(key);
  }

  delete(key: K): boolean {
    const entry = this.entries.get(key);
    if (!entry) {
      return false;
    }
    this.unlink(entry);
    return this.entries.delete(key);
  }

  get size(): number {
    return this.entries.size;
  }

  keys(): K[] {
    const keys: K[] = [];
    for (let entry = this.head; entry; entry = entry.next) {
      keys.push(entry.key);
    }
    return keys;
  }

  private unlink(entry: Entry<K, V>): void {
    if (entry.prev) {
      entry.prev.next = entry.next;
    } else {
      this.head = entry.next;
    }
    if (entry.next) {
      entry.next.prev = entry.prev;
    } else {
      this.tail = entry.prev;
    }
    entry.prev = null;
    entry.next = null;
  }

  private append(entry: Entry<K, V>): void {
    entry.prev = this.tail;
    if (this.tail) {
      this.tail.next = entry;
    } else {
      this.head = entry;
    }
    this.tail = entry;
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
