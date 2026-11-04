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

## Coming from TypeScript and JavaScript

`JSON.stringify` never refuses a value: a `Date` becomes ISO text through `toJSON`, `undefined` and functions disappear, and `NaN` turns into `null`. `JSON.parse` turns every number into a double. Two habits follow, and both lose data in Python:

```ts
JSON.stringify({ at: new Date(), skip: undefined });   // '{"at":"2026-11-04T12:30:00.000Z"}'
JSON.parse('{"amount": 12345678901234567.89}');         // { amount: 12345678901234568 }
```

```py
def default(self, o):
    return str(o)                        # "stringify anything": hides bugs, str(datetime) is not ISO

data = json.loads(text)                  # "parse, then fix": the float already lost digits
Decimal(str(data["amount"]))             # Decimal('12345678901234568')
```

Python raises `TypeError` for unknown types on purpose: a silent `str()` writes `"2026-11-04 09:30:00-03:00"` (a space, not `T`) or `"<object at 0x…>"` into a contract other teams parse. And precision must be kept *while* parsing: `parse_float` receives the original digits of every JSON number that has a fraction or an exponent, before any float exists.

## How it works

- **Encoding**: `json.dumps` handles the built-in types itself and calls `default(o)` only for the rest. `default` returns something encodable (it is encoded recursively, so a dataclass can become a dict that still holds `Decimal`s) or defers to `super().default(o)`, which raises `TypeError`.
- **Stable text**: `sort_keys=True` and `separators=(",", ":")` remove insertion order and whitespace, so equal values always serialize to identical text. That matters for signatures, cache keys and diffs.
- **Decoding hooks**: `parse_float` and `parse_int` receive number text, `parse_constant` receives `"NaN"`, `"Infinity"` and `"-Infinity"`, and `object_hook` receives each decoded `dict`.

What a round trip silently changes:

| Python value | After `loads(dumps(value))` |
| --- | --- |
| `(1, 2)` | `[1, 2]` |
| `{1: "a"}` | `{"1": "a"}`; `sort_keys` sorts before converting, so numeric keys sort by value |
| `{(1, 2): "a"}` | `TypeError`: keys must be `str`, `int`, `float`, `bool` or `None` |
| `float("nan")` | written as `NaN`, which is not valid JSON; other parsers reject it. `allow_nan=False` refuses it |
| `'{"x": 1, "x": 2}'` | `{"x": 2}`: the last duplicate key wins |

## Security note

`json` is the safe default for data from outside the process: decoding only builds plain values and never runs code. `pickle` is the opposite. Loading a pickle may call any importable function, because an object's `__reduce__` tells the loader what to call:

```py
class Payload:
    def __reduce__(self):
        return (print, ("this ran inside pickle.loads",))
```

Whoever writes the bytes chooses that function, so the `pickle` documentation says to unpickle only data you trust. `JSON.parse` has no equivalent risk, which is why the habit transfers badly. Never `eval` JSON-like text either. The `json` docs also warn that hostile input can use a lot of CPU and memory: cap the size before calling `loads`. Integers with more than 4,300 digits already raise `ValueError` (the interpreter-wide integer string conversion limit).

> **Status as of November 2026:** Python 3.14 adds exception notes that point to the failing part of an object when serialization fails, and makes `python -m json` the preferred command line (`python -m json.tool` is soft deprecated). `pickle` uses protocol 5 by default since 3.14. Python 3.15 adds an `array_hook` parameter to `json.load`/`loads`; this track runs 3.14.

## When to choose it

- **`json` with an encoder and `parse_float=Decimal`** for any data that crosses a process, team or language boundary.
- **A stable `dumps`** (sorted keys, compact separators, `allow_nan=False`) when text is signed, hashed or compared.
- **`pickle`** only for trusted, same-version Python processes (caches you write and read yourself), never for input.
- **A validation library** such as Pydantic when payloads need checked fields and types, not just conversion.
