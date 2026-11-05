An `Enum` is a class whose members are created once, when the class body runs. Each member is a singleton with a `name` and a `value`, and the class can be iterated, indexed by name and called with a value:

```py
from enum import Enum, Flag, StrEnum, auto

class Status(StrEnum):
    PENDING = auto()          # "pending": auto() lowercases the name in a StrEnum
    PAID = auto()

class Permission(Flag):
    READ = auto()             # 1
    WRITE = auto()            # 2
    DELETE = auto()           # 4

Status("paid") is Status.PAID         # True: lookup by value returns the singleton
Status["PAID"] is Status.PAID         # True: lookup by name
list(Status)                          # [<Status.PENDING: 'pending'>, <Status.PAID: 'paid'>]
Permission.READ in (Permission.READ | Permission.WRITE)   # True
```

## How it works

- **Lookup hooks**: `Status(value)` searches the values; when nothing matches, `Enum` calls the classmethod `_missing_(value)`, and returns its result if it is a member or raises `ValueError` if it returns `None`. That is the place for case-insensitive or legacy spellings.
- **Mixins**: `StrEnum` and `IntEnum` members *are* `str` and `int`, so they work where libraries expect those types (JSON, database drivers, old APIs) and compare equal to raw values. That interoperability is also their pitfall: two unrelated `IntEnum`s compare equal through their ints.
- **Flags**: `auto()` in a `Flag` gives powers of two, so members combine with `|`, `&`, `^` and `~`, and `in` tests containment. A value such as `ADMIN = READ | WRITE | DELETE` defined in the class is an alias. Iterating a flag value yields only its single-bit members, so `list(Permission.ADMIN)` is `[READ, WRITE, DELETE]`. A `Flag` rejects undefined bits with `ValueError`; an `IntFlag` keeps them.
- **Identity**: members are singletons, so `member is Status.PAID` is the idiomatic test, and members are hashable dictionary keys. Iterating the class skips aliases. A plain `Enum` member is equal only to itself: with `class Level(Enum): HIGH = 3`, `Level.HIGH == 3` is `False`, which is what a closed set means.
- **Parse at the edge**: a function that reads outside text should hand back the member, not the string. The rest of the code then compares with `is`, and a typo such as `"payed"` fails once, at the boundary, with `ValueError`.

> **Status as of November 2026:** `StrEnum`, iteration and `len()` of flag values, and the `boundary=` options of `Flag` arrived in Python 3.11, which also changed `IntEnum.__str__` to return the bare number. `_missing_` exists since 3.6.

## Common mistakes

**Numbering `Flag` members 1, 2, 3.** Flag membership is a bit test, and `3` is the bits `1 | 2`, so `DELETE` silently becomes an alias of `READ | WRITE`:

```py
# wrong: a user holding READ and WRITE also "holds" DELETE
class Permission(Flag):
    READ = 1
    WRITE = 2
    DELETE = 3

# right: auto() gives powers of two, one bit per member
class Permission(Flag):
    READ = auto()       # 1
    WRITE = auto()      # 2
    DELETE = auto()     # 4
```

**Returning the string instead of the member.** `def parse(text): return text.lower()` lets `"payed"` travel through the program unchecked; `return Status(text)` refuses it.

**Choosing `IntEnum` by reflex.** Its members equal plain ints and members of every other `IntEnum` with the same value:

```py
class Priority(IntEnum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3

class Retries(IntEnum):
    ONCE = 1
    TWICE = 2
    THRICE = 3

Priority.HIGH == Retries.THRICE      # True: two unrelated ideas compare equal
```

## When to choose it

- **`Enum`** for closed sets compared inside the program: severities, states of a workflow.
- **`StrEnum`** when the values cross a boundary as text (JSON fields, query parameters), with `_missing_` for the spellings you accept.
- **`Flag`** for combinable options and permissions instead of hand-written bit masks.
- **`IntEnum`/`IntFlag`** only to replace existing integer constants that other code still compares with ints.
- **`typing.Literal`** for type checkers when no runtime object is needed (module 09).
