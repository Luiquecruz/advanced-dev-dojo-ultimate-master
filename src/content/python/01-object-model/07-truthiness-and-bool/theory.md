Every Python object has a truth value, used by `if`, `while`, `not`, `and`, `or` and `bool()`.

An object is **falsy** when it is one of these, and **truthy** otherwise:

- `None` and `False`
- zero of any numeric type: `0`, `0.0`, `0j`, `Decimal(0)`
- empty sequences and collections: `""`, `()`, `[]`, `{}`, `set()`, `range(0)`
- instances whose class defines `__bool__` returning `False`, or `__len__` returning `0`

```py
items = []
if not items:               # idiomatic emptiness check
    print("nothing to do")
```

## How it works

`bool(x)` calls `x.__bool__()` if the class defines it. If not, it calls `x.__len__()` and tests for `0`. If neither exists, the object is truthy.

```py
class Quota:
    def __init__(self, limit, used):
        self.limit, self.used = limit, used

    def __bool__(self):
        return self.used < self.limit    # "has capacity left"

if quota:
    ...                                  # reads like English
```

Only the listed values are falsy, so a few results surprise newcomers: `"0"` and `"False"` are non-empty strings and therefore truthy, `float("nan")` is a non-zero number and truthy, and `[0]` is a list with one item and truthy.

`and` and `or` **return one of their operands**, not a boolean:

```py
name = user_name or "anonymous"     # "anonymous" when user_name is falsy
0 or None                           # None: the last operand
[] and 5                            # []: the first falsy operand
```

Write `if items:` and `if not items:` for emptiness. Never test `if x == True` or `if x == False`: the plain `if x:` already asks the question.

## Common mistakes

**Using `or` to fill in a value that was not given.** `or` replaces **every** falsy value, not only `None`, so a caller who passes `0`, `""` or `[]` on purpose loses it. When only `None` means "not given", test it with `is None`:

```py
def connect(retries=None):
    retries = retries or 3        # wrong: retries=0 becomes 3

def connect(retries=None):
    if retries is None:           # right: only None means "not given"
        retries = 3
```

The same applies inside loops: `if value:` skips `0` and `""`, `if value is not None:` keeps them. Use truthiness for **emptiness and "has something"**, and `is None` for **absence**.

## When to choose it

- **`if not items` / `if items`** for containers and strings, where emptiness is the question.
- **`is None`** when `0`, `""`, `[]` or `False` are valid data.
- **A custom `__bool__`** when "truthy" has a natural domain meaning (capacity left, connected, non-empty result). Define `__len__` instead when the object is a sized collection.
- **`or` defaults** only when every falsy value really should be replaced.
