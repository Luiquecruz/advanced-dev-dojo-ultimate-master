Split an ordering feature into a command side and a query side in `Program.cs`, with no library: two handler interfaces, a validator and one decorator. An in-memory `OrderStore` stands in for the `DbContext` of the lesson; it counts its `SaveChanges` calls so the tests can see what wrote. The interfaces, `ValidationException`, the request records, `Order`, `IOrderReader` and `OrderStore` are given; do not change them.

## `PlaceOrderHandler`, the command side

`HandleAsync(PlaceOrder command, ct)` creates an `Order` with a new id from `Guid.CreateVersion7()`, calls `Place()`, adds it to the store, calls `SaveChanges()` once and returns the order's id. A command returns the id, not the order.

## `GetOrderSummaryHandler`, the query side

It depends on `IOrderReader` only, so it cannot write. `HandleAsync(GetOrderSummary query, ct)` returns an `OrderSummary(Id, Sku, Quantity, Total, Status)`, where `Total` is `Quantity * UnitPrice`, or `null` when no order has that id. It never saves.

## `PlaceOrderValidator`

`Validate(command)` returns one message per broken rule, each starting with the property name, and an empty list for a valid command:

- `CustomerId` is not `Guid.Empty`;
- `Sku` is not `null`, empty or whitespace;
- `Quantity` is greater than 0;
- `UnitPrice` is greater than 0.

## `ValidationDecorator<TCommand, TResult>`

A decorator implements `ICommandHandler<TCommand, TResult>` and wraps another handler of the same interface. It validates the command first. When there are errors it throws `new ValidationException(errors)`, and the inner handler never runs. Otherwise it awaits the inner handler with the same command and token and returns its result unchanged. It works for any command type that has a validator.
