Model an order as an aggregate in `Program.cs`. The aggregate is the only way to change an order, so every rule below is checked inside it, and a call that breaks a rule changes nothing. `OrderLine`, `IDomainEvent`, `OrderPlaced` and `OrderStatus` are given; do not change them.

## `Money`, a value object

A `sealed record` with `Amount` and `Currency`, set through the constructor `new Money(amount, currency)`.

- `Amount` below 0 throws `ArgumentOutOfRangeException`; a `Currency` that is not exactly 3 characters throws `ArgumentException`. The checks live in the `init` accessors (use `field`), so `price with { Amount = -1 }` throws too.
- Two `Money` values with the same amount and currency are equal (a record gives you that).
- `Add(other)` returns a new `Money` with the sum. Different currencies throw `InvalidOperationException`.
- `Times(quantity)` returns a new `Money` with `Amount * quantity`.

## `Order`, the aggregate root

`new Order(id, currency)` creates a `Draft` order with a `Total` of 0 in that currency. `Id`, `Currency`, `Status` and `Total` have private setters.

- `AddLine(sku, quantity, unitPrice)` appends an `OrderLine` and adds `unitPrice.Times(quantity)` to `Total`. It throws, and leaves the order unchanged, when:
  - the order is not `Draft`: `InvalidOperationException`;
  - `quantity` is 0 or less: `ArgumentOutOfRangeException`;
  - the order already has `MaxLines` (10) lines: `InvalidOperationException`;
  - `unitPrice` is in another currency: `InvalidOperationException`.
- `Lines` lets callers read the lines, and only read them: no code outside `Order` can add or remove a line through it.
- `Place()` moves a `Draft` order with at least one line to `Placed` and records one `OrderPlaced(Id, Total)` event. An order with no lines, or one that is already placed, throws `InvalidOperationException`.
- `DequeueEvents()` returns the events recorded since the last call, in order, and forgets them, so a second call returns an empty list. The list it returned keeps its events.
