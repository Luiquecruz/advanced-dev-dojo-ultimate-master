`_missing_` is a classmethod that receives the value that was not found. If it is a `str`, compare its `casefold()` with each `member.value` and return the matching member; otherwise return `None`, and `Enum` raises `ValueError` for you. `parse` then only needs `return cls(text)`.
---
Give each permission its own bit with `auto()` (1, 2, 4). `ADMIN = READ | WRITE | DELETE` inside the class body combines the plain values and becomes an alias. Iterating a flag value (`for member in flags`) yields only single-bit members, which is what `describe` sorts.
---
`IntEnum` members are ints, so they equal ints. Declare `Severity` on plain `Enum`: `Severity(3)` still finds `HIGH` by value, but `Severity.HIGH == 3` is `False`.
