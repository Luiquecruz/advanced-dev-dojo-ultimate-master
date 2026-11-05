A checkout service searches carts, validates payments and checks fraud rules. Its helpers build complete lists with list comprehensions before `[0]`, `sum()` and `any()` get to work. Make them lazy in `main.py`.

## `first_match(items, predicate, default=None)`

- Return the first item for which `predicate(item)` is truthy, using `next()` on a generator expression.
- `predicate` is never called on the items after the match.
- Return `default` only when no item matches: a falsy match such as `0` is still returned.
- When `items` is a generator, only the items up to the match are consumed, so a second call on the same generator continues after the previous match.

## `total_valid(records, is_valid)`

- `records` is any iterable of dicts with an `"amount"`. Return the sum of the amounts of the records for which `is_valid(record)` is truthy, calling `is_valid` once per record.
- Use a generator expression inside `sum()`, so each valid amount is added before the next record is read. The tests record the order of reads and additions.
- An empty or exhausted input sums to `0`.

## `count_evaluations(items, predicate)`

- Return a tuple `(found, evaluations)`: `found` is `any(...)` of `predicate` over `items`, and `evaluations` is how many times `predicate` was called.
- `any` must stop at the first truthy result: `[1, 3, 4, 5, 7]` with an "is even" predicate gives `(True, 3)`.
- The starter already counts calls with a closure and `nonlocal`; what it feeds `any()` is the problem.
