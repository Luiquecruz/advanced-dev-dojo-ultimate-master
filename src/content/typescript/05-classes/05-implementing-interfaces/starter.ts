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

// TODO: implement Cache and Serializable
class MemoryCache {}

// TODO: declare const CacheClass: CacheConstructor = MemoryCache;
