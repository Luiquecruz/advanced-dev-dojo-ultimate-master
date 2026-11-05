`ReservationService` holds stock for a customer for 15 minutes and releases holds that have expired. Write the two test doubles its tests need, then give the service the seam that lets a test control time. Everything goes in `Program.cs`; `IStockGateway` and `Hold` are already there.

## `FakeStockGateway : IStockGateway`

A small working implementation with state of its own:

- `With(sku, quantity)` sets the stock of a SKU and returns the fake itself, so calls can be chained.
- `GetAvailableAsync` returns the current stock, and `0` for a SKU it has never seen.
- `ReserveAsync` takes the quantity off the stock and appends `(sku, quantity)` to `Reservations`; `ReleaseAsync` puts it back and appends to `Releases`.
- `FailingOn(sku)` makes every later `ReserveAsync` for that SKU throw `InvalidOperationException`, without recording or changing anything. Use it to simulate a dependency that is down.

## `ManualTimeProvider : TimeProvider`

A clock that only moves when the test says so:

- `new ManualTimeProvider(start)`: `GetUtcNow()` returns `start`.
- `Advance(duration)` moves the time forward by `duration`. Nothing else moves it.

## `ReservationService`

The service already works, but it reads the system clock, so no test can say "15 minutes later". Make it use the `TimeProvider` it receives in its constructor:

- `HoldAsync` stamps each hold with the injected clock's time.
- `ExpireHoldsAsync` releases every hold that is **15 minutes old or older** and keeps younger ones.

`System.Threading` is already imported at the top of the file.
