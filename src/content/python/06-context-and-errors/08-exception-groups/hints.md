`validate_all` is an error collector: `try: rule(record) except Exception as error: errors.append(error)` inside the loop, then raise the group only `if errors:`. `ExceptionGroup` refuses an empty list.
---
`except*` clauses cannot `return`. Start `handle` with `counts = {"ValueError": 0, "TypeError": 0}`, write `try: raise group` followed by `except* ValueError as matched:` and `except* TypeError as matched:`, fill `counts` inside them and return after the `try`. The unmatched members re-raise by themselves.
---
`matched.exceptions` only lists the top level, and a member can itself be a group. A small recursive helper that walks `exceptions` and descends into every `BaseExceptionGroup` gives the leaves. For `only`, `group.subgroup(kind)` already keeps the message and nesting and returns `None` when nothing matches.
