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

export class Cache<V> {
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor({ ttlMs, now = Date.now }: CacheOptions) {
    this.ttlMs = ttlMs;
    this.now = now;
  }

  getOrLoad(key: string, load: () => Promise<V>): Promise<V> {
    // TODO: return a fresh cached value, share an in-flight load for the same key, otherwise load and store { value, storedAt }
    return load();
  }

  invalidate(key: string): void {
    // TODO: drop the stored value and make sure an in-flight load for this key will not be stored
  }
}

export function createProductService(products: ProductRepository, cache: Cache<Product | null>) {
  return {
    getProduct(id: number): Promise<Product | null> {
      // TODO: read through the cache with the key product:<id>
      return products.findById(id);
    },
    async updatePrice(id: number, price: number): Promise<Product> {
      // TODO: throw `Product not found` for unknown ids and invalidate product:<id> after the write
      return (await products.updatePrice(id, price)) as Product;
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
