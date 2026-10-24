The project is moving to Node's type stripping, so `erasableSyntaxOnly` will reject the `OrderStatus` enum. Refactor it.

1. Replace the `enum` with a `const OrderStatus = { ... } as const` object that has the same members and values (`Pending: 'pending'`, `Shipped: 'shipped'`, `Delivered: 'delivered'`).
2. Declare a type with the same name, `OrderStatus`, equal to `"pending" | "shipped" | "delivered"`, derived from the object.
3. Existing code that uses `OrderStatus.Pending` must keep working, and plain strings such as `canCancel('pending')` must now be accepted.
4. Implement `nextStatus(status: OrderStatus): OrderStatus`: `pending` → `shipped`, `shipped` → `delivered`, `delivered` stays `delivered`.

The word `enum` must not appear in your code.
