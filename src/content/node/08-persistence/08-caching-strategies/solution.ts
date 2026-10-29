export interface Product {
  id: number;
  name: string;
  price: number;
}

export class ProductRepository {
  reads = 0;
  private readonly products = new Map<number, Product>([
    [1, { id: 1, name: 'Keyboard', price: 120 }],
    [2, { id: 2, name: 'Mouse', price: 45 }],
  ]);

  async findById(id: number): Promise<Product | null> {
    this.reads++;
    const product = this.products.get(id);
    return product ? { ...product } : null;
  }

  async updatePrice(id: number, price: number): Promise<Product | null> {
    const product = this.products.get(id);
    if (!product) {
      return null;
    }
    product.price = price;
    return { ...product };
  }
}

export interface CacheOptions {
  ttlMs: number;
  now?: () => number;
}

interface Entry<V> {
  value: V;
  storedAt: number;
}

export class Cache<V> {
  private readonly entries = new Map<string, Entry<V>>();
  private readonly inFlight = new Map<string, Promise<V>>();
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor({ ttlMs, now = Date.now }: CacheOptions) {
    this.ttlMs = ttlMs;
    this.now = now;
  }

  getOrLoad(key: string, load: () => Promise<V>): Promise<V> {
    const entry = this.entries.get(key);
    if (entry && this.now() - entry.storedAt < this.ttlMs) {
      return Promise.resolve(entry.value);
    }
    const pending = this.inFlight.get(key);
    if (pending) {
      return pending;
    }
    const promise: Promise<V> = load().then(
      (value) => {
        if (this.inFlight.get(key) === promise) {
          this.inFlight.delete(key);
          this.entries.set(key, { value, storedAt: this.now() });
        }
        return value;
      },
      (error) => {
        if (this.inFlight.get(key) === promise) {
          this.inFlight.delete(key);
        }
        throw error;
      },
    );
    this.inFlight.set(key, promise);
    return promise;
  }

  invalidate(key: string): void {
    this.entries.delete(key);
    this.inFlight.delete(key);
  }
}

export function createProductService(products: ProductRepository, cache: Cache<Product | null>) {
  return {
    getProduct(id: number): Promise<Product | null> {
      return cache.getOrLoad(`product:${id}`, () => products.findById(id));
    },
    async updatePrice(id: number, price: number): Promise<Product> {
      const product = await products.updatePrice(id, price);
      if (!product) {
        throw new Error('Product not found');
      }
      cache.invalidate(`product:${id}`);
      return product;
    },
  };
}

async function main() {
  const repository = new ProductRepository();
  const service = createProductService(repository, new Cache<Product | null>({ ttlMs: 60_000 }));
  await Promise.all([service.getProduct(1), service.getProduct(1), service.getProduct(1)]);
  await service.getProduct(1);
  console.log('reads after 4 gets:', repository.reads);
  await service.updatePrice(1, 99);
  console.log(await service.getProduct(1), 'reads:', repository.reads);
}

main();
