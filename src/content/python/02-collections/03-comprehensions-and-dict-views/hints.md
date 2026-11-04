`invert` and `group_by` both need a container per key. `collections.defaultdict(set)` (or `setdefault`) removes the "does this key exist yet" branch, and a plain loop is fine: a comprehension is not required for these two.
---
`mapping.keys()` is already a live view and `first.keys() & second.keys()` is already a set. Do not wrap them in `list(...)` unless the contract asks for a snapshot.
---
For `group_by`, append to `groups[key(item)]` inside one loop over `items`; dicts keep insertion order, and appending keeps the item order inside each group.
