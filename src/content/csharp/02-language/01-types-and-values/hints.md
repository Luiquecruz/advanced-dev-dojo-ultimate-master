For each method, ask what the parameter holds: a struct parameter holds a copy of the value, a `ref` parameter is the caller's variable, and a class parameter holds a copy of a reference to the one shared object.
---
`var copy = price;` copies a struct, so changing `copy` leaves `price` alone. In `Discount`, assign `price.Amount` directly. In `RaiseAll`, a `foreach` variable is also a copy: loop with an index, change a local copy, then store it with `prices[index] = copy;`.
---
`skus = [.. skus, "GIFT-01"];` builds a new list and points only the method's own variable at it; call `skus.Add(...)` on the shared list instead, after checking `skus.Contains(...)`. For `SameCart`, `object.ReferenceEquals(first, second)` asks "same object?", which is exactly the question.
