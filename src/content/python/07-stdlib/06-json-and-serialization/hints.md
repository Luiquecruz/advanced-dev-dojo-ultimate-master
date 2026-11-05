`default` is only called for objects `json` cannot encode. Check the types you support with `isinstance` (a `datetime` is also a `date`), return a plain value for each, and end with `return super().default(o)` so everything else still raises `TypeError`.
---
`dataclasses.is_dataclass(o)` is also true for the class itself; add `not isinstance(o, type)` before calling `dataclasses.asdict(o)`. The dict it returns may still hold `Decimal` and `datetime` values, and `json` will call `default` again for each of them.
---
`json.dumps` takes `cls=`, `sort_keys=`, `separators=` and `allow_nan=`. `json.loads` takes `parse_float=Decimal` (it receives the original text) and `parse_constant=`, a function called with `"NaN"`, `"Infinity"` or `"-Infinity"` that can raise `ValueError`.
