Collect the user's permission sets first: `[roles[name] for name in user_roles]`. Then `set().union(*sets)` gives the union and `set.intersection(*sets)` the common part, as long as `sets` is not empty.
---
`granted`, `needed` and the results are all sets, so `needed - granted` and `granted - needed` give `missing` and `unused` directly. Return new sets: set operators never modify their operands.
---
A dict remembers insertion order and its keys are unique and hashable: `list(dict.fromkeys(items))` solves `dedupe_keep_order` and raises `TypeError` for unhashable items by itself.
