Square brackets build the whole list before the next step runs. Every function in the starter becomes lazy by replacing `[... for ...]` with `(... for ...)`, or with no extra brackets at all when the expression is the only argument of a call such as `sum(...)` or `any(...)`.
---
`next(iterator, default)` returns the first item of an iterator, or `default` when there is none. Give it a generator expression with the `if predicate(item)` clause. Do not add `or default` afterwards: a match of `0` would be replaced.
---
`total_valid` becomes a single `sum()` call over a generator expression with an `if` clause, so `is_valid` runs once per record as it is read. In `count_evaluations`, keep the counting closure and change only what `any()` receives.
