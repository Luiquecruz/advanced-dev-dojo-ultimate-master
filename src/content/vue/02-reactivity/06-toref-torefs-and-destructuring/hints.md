`state.coupon` is a plain string the moment you read it. `toRefs(state)` returns `{ items: Ref, coupon: Ref }` linked to the reactive object; spread it into the returned object.
---
`toRef(() => state.items.length)` creates a read-only ref whose `.value` calls the getter every time it is read.
---
In `useLength`, `toValue(source)` returns the string whether `source` is a string, a ref or a getter. Call it inside `computed(() => ...)` so the read is tracked.
