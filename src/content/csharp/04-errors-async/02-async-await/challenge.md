Finish a small price client in `Program.cs`. `IPriceSource.GetPriceAsync(sku)` asks a remote price service for one SKU; it throws `KeyNotFoundException` for an unknown SKU and other exceptions when the service fails.

## `Prices.GetAllAsync(source, skus)`

Returns a `Dictionary<string, decimal>` with the price of every SKU in `skus` (the SKUs are distinct). The requests are independent, so **start every request before awaiting any of them**, then wait for all of them together with `Task.WhenAll`. The tests hold every answer back and check that all the requests were already started. If one request fails, `GetAllAsync` fails with that request's exception.

## `Prices.TryGetAsync(source, sku)`

Returns the price, or `null` when the source throws `KeyNotFoundException`. Every other exception (a service that is down, for example) passes through to the caller unchanged.

## `PriceCache`

`new PriceCache(source)` remembers the prices it has loaded. `GetAsync(sku)` returns a `ValueTask<decimal>`:

- for a SKU that is already cached, a `ValueTask` that is **already completed** (`IsCompletedSuccessfully` is `true`), without calling the source;
- otherwise, a `ValueTask` over the load from the source, which stores the price once it arrives.

A load that throws stores nothing, so the next call asks the source again. Do not block on any task with `.Result` or `.Wait()`.
