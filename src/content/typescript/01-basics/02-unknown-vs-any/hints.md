Use `typeof value === "string"` and `typeof value === "number"` checks.
---
Inside each `if` block the compiler already knows the narrowed type, so `.length` and `* 2` are allowed.
---
Template literals help: `` `text(${value.length})` ``.
