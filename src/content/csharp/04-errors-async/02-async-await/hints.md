In `GetAllAsync`, the first loop only calls `source.GetPriceAsync(sku)` and adds the returned `Task<decimal>` to a list, without `await`. Then `decimal[] prices = await Task.WhenAll(tasks);` gives the results in the same order as `skus`, so `prices[i]` belongs to `skus[i]`.
---
`TryGetAsync` is a `try` around `return await source.GetPriceAsync(sku);` with `catch (KeyNotFoundException) { return null; }`. The `await` must be inside the `try`: the exception is rethrown when the task is awaited.
---
In `PriceCache.GetAsync`, check the dictionary first and `return new ValueTask<decimal>(price);` on a hit. On a miss, call a private `async Task<decimal> LoadAsync(string sku)` that awaits the source, stores the price and returns it, and wrap it: `return new ValueTask<decimal>(LoadAsync(sku));`.
