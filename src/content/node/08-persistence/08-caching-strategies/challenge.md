Build a cache-aside cache with a TTL, in-flight deduplication and safe invalidation, then put it in front of a product repository. `Product`, `ProductRepository` (it counts its `reads`) and `CacheOptions` are given.

## `new Cache<V>({ ttlMs, now? })`

`now` returns the current time in milliseconds and defaults to `Date.now`; the tests inject a fake clock.

`cache.getOrLoad(key, load)` returns a promise of the value:

1. **Hit**: when the key has a stored entry and `now() - storedAt < ttlMs`, resolve with the stored value without calling `load`.
2. **Miss**: otherwise call `load()`, store `{ value, storedAt: now() }` when it resolves, and resolve with the value. An entry stored at `1000` with `ttlMs: 500` is fresh at `1499` and expired at `1500`.
3. **In-flight deduplication**: while a load for a key is pending, every other `getOrLoad` for that key returns the same pending result; `load` is called once.
4. **Failures**: when `load` rejects, every waiter rejects with that error, nothing is stored, and the next `getOrLoad` calls `load` again.

`cache.invalidate(key)` removes the stored entry. If a load for that key is in flight, its callers still receive its value, but the value must **not** be stored: the next `getOrLoad` loads again.

## `createProductService(products, cache)`

Returns `{ getProduct, updatePrice }`:

- `getProduct(id)` reads through the cache with the key `product:<id>` and `products.findById(id)` as the loader (unknown ids resolve with `null`).
- `updatePrice(id, price)` calls `products.updatePrice(id, price)`; when it returns `null` it throws `new Error('Product not found')`, otherwise it invalidates `product:<id>` **after** the write and returns the updated product.
