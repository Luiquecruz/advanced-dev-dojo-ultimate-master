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

## How Python decides

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

`and` and `or` **return one of their operands**, not a boolean:

```py
name = user_name or "anonymous"     # "anonymous" when user_name is falsy
0 or None                           # None: the last operand
[] and 5                            # []: the first falsy operand
```

## Coming from TypeScript and JavaScript

| Value | JavaScript | Python |
| --- | --- | --- |
| `[]` | truthy | **falsy** |
| `{}` | truthy | **falsy** |
| `"0"` | truthy | truthy |
| `NaN` | falsy | truthy |
| `null` / `undefined` | falsy | `None` is falsy |

- `if (arr.length === 0)` becomes `if not arr`.
- There is **no `??` operator**. `value or default` also replaces `0`, `""` and `[]`. To replace only `None`, write `default if value is None else value`.

## Pitfalls

```py
def connect(retries=None):
    retries = retries or 3        # BUG: retries=0 becomes 3

def connect(retries=None):
    if retries is None:           # correct: only None means "not given"
        retries = 3
```

Use truthiness for **emptiness and "has something"**, and `is None` for **absence**. Never test `if x == True` or `if x == False`.

## When to choose it

- **`if not items` / `if items`** for containers and strings, where emptiness is the question.
- **`is None`** when `0`, `""`, `[]` or `False` are valid data.
- **A custom `__bool__`** when "truthy" has a natural domain meaning (capacity left, connected, non-empty result). Define `__len__` instead when the object is a sized collection.
- **`or` defaults** only when every falsy value really should be replaced.
