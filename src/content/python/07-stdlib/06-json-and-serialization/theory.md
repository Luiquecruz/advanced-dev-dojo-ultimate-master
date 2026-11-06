`json` converts between JSON text and a fixed set of Python types: `dict`, `list`, `str`, `int`, `float`, `bool` and `None`. Everything else needs a hook, in both directions:

```py
import json
from decimal import Decimal

class MoneyEncoder(json.JSONEncoder):
    def default(self, o):                    # called only for objects json cannot encode
        if isinstance(o, Decimal):
            return str(o)
        return super().default(o)            # raises TypeError for the rest

json.dumps({"total": Decimal("19.90")}, cls=MoneyEncoder)  # '{"total": "19.90"}'
json.loads("0.1", parse_float=Decimal)                      # Decimal('0.1')
```

## How it works

- **Encoding**: `json.dumps` handles the built-in types itself and calls `default(o)` only for the rest. `default` returns something encodable (it is encoded recursively, so a dataclass can become a dict that still holds `Decimal`s) or defers to `super().default(o)`, which raises `TypeError`. The refusal is deliberate: an unknown type in a contract other teams parse is a bug to see, not text to guess.
- **Stable text**: `sort_keys=True` and `separators=(",", ":")` remove insertion order and whitespace, so equal values always serialize to identical text. That matters for signatures, cache keys and diffs.
- **Decoding hooks**: `parse_float` and `parse_int` receive the original number text before any `float` exists, so `parse_float=Decimal` keeps every digit; `parse_constant` receives `"NaN"`, `"Infinity"` and `"-Infinity"`, and `object_hook` receives each decoded `dict`.

What a round trip silently changes:

| Python value | After `loads(dumps(value))` |
| --- | --- |
| `(1, 2)` | `[1, 2]` |
| `{1: "a"}` | `{"1": "a"}`; `sort_keys` sorts before converting, so numeric keys sort by value |
| `{(1, 2): "a"}` | `TypeError`: keys must be `str`, `int`, `float`, `bool` or `None` |
| `float("nan")` | written as `NaN`, which is not valid JSON; other parsers reject it. `allow_nan=False` refuses it |
| `'{"x": 1, "x": 2}'` | `{"x": 2}`: the last duplicate key wins |

## Common mistakes

**Ending `default` with `return str(o)`.** Every unknown object then turns into text without an error: a `datetime` becomes `"2026-11-04 09:30:00-03:00"` (a space, not the ISO `T`), a `set` becomes `"{'a', 'b'}"` and a class becomes `"<class 'main.Invoice'>"`, all inside a contract other programs parse:

```py
# wrong: anything the encoder does not know becomes a string
def default(self, o):
    if isinstance(o, Decimal):
        return str(o)
    return str(o)

# right: handle the types you mean, refuse the rest with TypeError
def default(self, o):
    if isinstance(o, Decimal):
        return str(o)
    return super().default(o)
```

**Converting to `Decimal` after `loads`.** `Decimal(str(json.loads(text)["amount"]))` starts from the float, so `12345678901234567.89` has already become `12345678901234568`. Pass `parse_float=Decimal` to `loads` instead.

## Security note

`json` is the safe default for data from outside the process: decoding only builds plain values and never runs code. `pickle` is the opposite. Loading a pickle may call any importable function, because an object's `__reduce__` tells the loader what to call:

```py
class Payload:
    def __reduce__(self):
        return (print, ("this ran inside pickle.loads",))
```

Whoever writes the bytes chooses that function, so the `pickle` documentation says to unpickle only data you trust. Never `eval` JSON-like text either. The `json` docs also warn that hostile input can use a lot of CPU and memory: cap the size before calling `loads`. Integers with more than 4,300 digits already raise `ValueError` (the interpreter-wide integer string conversion limit).

> **Status as of November 2026:** Python 3.14 adds exception notes that point to the failing part of an object when serialization fails, and makes `python -m json` the preferred command line (`python -m json.tool` is soft deprecated). `pickle` uses protocol 5 by default since 3.14. Python 3.15 adds an `array_hook` parameter to `json.load`/`loads`; this track runs 3.14.

## When to choose it

- **`json` with an encoder and `parse_float=Decimal`** for any data that crosses a process, service or team boundary.
- **A stable `dumps`** (sorted keys, compact separators, `allow_nan=False`) when text is signed, hashed or compared.
- **`pickle`** only for trusted, same-version Python processes (caches you write and read yourself), never for input.
- **A validation library** such as Pydantic when payloads need checked fields and types, not just conversion.
