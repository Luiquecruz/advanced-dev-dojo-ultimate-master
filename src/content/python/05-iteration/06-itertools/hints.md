Each function maps to one tool: `batched` for chunks, `groupby` for runs, `accumulate` for running totals, `pairwise` for neighbors. Import them from `itertools`; none of them needs the input to be a list, and none of them copies it.
---
`batches` can return the `batched(...)` iterator directly: it is already lazy and already keeps the short last batch. For `runs`, give `groupby` a `key` that reads the status (`operator.itemgetter("status")` or a lambda), and do **not** sort first: sorting merges runs that are apart.
---
`groupby` yields `(status, group)` where `group` is an iterator, so count it before moving on: `sum(1 for _ in group)`. For `transitions`, keep only the pairs from `pairwise(statuses)` whose two statuses differ.
