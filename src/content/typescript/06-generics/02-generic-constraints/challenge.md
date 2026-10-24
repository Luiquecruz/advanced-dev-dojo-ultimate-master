The starter uses plain parameter types, so results lose the caller's type. Rewrite each function with a
**constrained type parameter**:

1. `longest(a, b)` — accepts two values that have a `length: number`, returns the longer one (`a` on ties).
   `longest([1, 2], [3])` must be typed `number[]`.
2. `byPriority(items)` — accepts a readonly array of objects with `priority: number` and returns a **new**
   array sorted by priority, highest first, without mutating the input. The element type must be preserved:
   `byPriority([{ title: 'Ship', priority: 2 }])[0].title` must compile.
3. `totalBy(items, select)` — generic over the item type (no constraint needed) and sums
   `select(item)` for every item.

Calls with values that do not satisfy the constraint must be compile errors.
