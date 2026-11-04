`copy.deepcopy` already copies nested structures and handles cycles. You do not need to write recursion for `clone_config`: copy first, then apply `update(overrides)`.
---
`{**defaults, **config}` and `dict(defaults)` are shallow copies, so mutable defaults stay shared. Deep-copy `defaults` before merging, and decide whether `config` values need the same treatment.
---
For `diff_shared`, intersect the keys (`first.keys() & second.keys()`), keep those where `first[key] is second[key]` and `isinstance(first[key], (list, dict, set))`, and return `sorted(...)`.
