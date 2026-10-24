interface Cache {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  has(key: string): boolean;
  size(): number;
}

interface Serializable {
  serialize(): string;
}

interface CacheConstructor {
  new (initial?: Record<string, string>): Cache;
}

class MemoryCache implements Cache, Serializable {
  #entries: Map<string, string>;

  constructor(initial: Record<string, string> = {}) {
    this.#entries = new Map(Object.entries(initial));
  }

  get(key: string): string | undefined {
    return this.#entries.get(key);
  }

  set(key: string, value: string): void {
    this.#entries.set(key, value);
  }

  has(key: string): boolean {
    return this.#entries.has(key);
  }

  size(): number {
    return this.#entries.size;
  }

  serialize(): string {
    return JSON.stringify(Object.fromEntries(this.#entries));
  }
}

const CacheClass: CacheConstructor = MemoryCache;
