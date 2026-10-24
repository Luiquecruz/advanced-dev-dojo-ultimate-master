1. Turn the enum body into an object literal with the same keys and string values, and add `as const`.
2. Get the object's type with `typeof OrderStatus`, its keys with `keyof`, and index the type with those keys to obtain the value union.
3. Give that type alias the same name as the object so `status: OrderStatus` annotations and `OrderStatus.Pending` expressions both keep working.
4. Implement `nextStatus` with two comparisons: pending moves to shipped, everything else ends at delivered.
