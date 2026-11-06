The fake needs two private fields: a `Dictionary<string, int>` for the stock and a `HashSet<string>` for the failing SKUs. `With` and `FailingOn` write to them and `return this;`. `GetAvailableAsync` is `Task.FromResult(_stock.GetValueOrDefault(sku))`, which gives `0` for an unknown SKU.
---
In `ReserveAsync`, check the failing set first and throw before touching anything, so a failed call leaves no trace. Methods that return `Task` without awaiting anything end with `return Task.CompletedTask;`.
---
`ManualTimeProvider` keeps one `DateTimeOffset` field that starts at `start`; `GetUtcNow()` returns it and `Advance` adds to it. In `ReservationService`, replace both `DateTimeOffset.UtcNow` with `clock.GetUtcNow()`: the constructor already receives the clock, the starter just never uses it.
