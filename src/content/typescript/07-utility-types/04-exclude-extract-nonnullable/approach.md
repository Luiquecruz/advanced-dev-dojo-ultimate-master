1. Derive `EventType` with indexed access on the `type` property.
2. Use `Extract` with a `{ type: ... }` shape for the click and keyboard/focus variants, and `Exclude` for the rest.
3. Change `compact`'s return type to `NonNullable<T>[]` and filter with an explicit type predicate that only rejects `null` and `undefined`.
4. Filter click events with an `event is ClickEvent` predicate.
