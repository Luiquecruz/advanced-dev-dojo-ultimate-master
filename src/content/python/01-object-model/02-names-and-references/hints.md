Ask of each function: should it change an existing object, or build a new one? `list.append` and `+=` change the object a name points to. `+` and `list(...)` build a new object.
---
`add_item` must mutate and return the very same list. `snapshot` needs a copy: `list(cart)` or `cart.copy()`. `merge_carts` can build `list(first)` and then extend it, or use `first + second` (a new list).
---
`[[]] * count` repeats one reference. Build one list per position with a comprehension: `[[] for _ in range(count)]`.
