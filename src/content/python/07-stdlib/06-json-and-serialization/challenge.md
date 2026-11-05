An invoicing service exchanges JSON with three other teams. Invoices are dataclasses with `Decimal` amounts and timezone-aware `datetime` stamps, which `json` cannot encode out of the box, and the payments team signs the exact text it receives, so the output has to be byte-for-byte stable. Write the serialization layer in `main.py`. The `Invoice` and `Line` dataclasses are already there.

## `class DojoEncoder(json.JSONEncoder)`

Override `default(o)` so that:

- a `datetime.datetime` or `datetime.date` becomes its `isoformat()` text;
- a `decimal.Decimal` becomes its `str()` text (`Decimal("19.90")` → `"19.90"`, never a float);
- a dataclass **instance** becomes a JSON object with its fields (`dataclasses.asdict`), nested dataclasses included;
- anything else is refused with the base class behavior: `TypeError`. Never fall back to `str(o)`.

## `dumps_stable(value)`

Returns JSON text using `DojoEncoder`, with keys sorted, the compact separators `(",", ":")` and no spaces anywhere, so equal values always give identical text. It raises `ValueError` for `NaN` or infinite floats, which are not valid JSON.

## `loads_with_decimals(text)`

Parses JSON text and returns every number with a fraction or exponent as a `Decimal` built from the **original digits**, while integers stay `int`. It raises `ValueError` when the text contains `NaN`, `Infinity` or `-Infinity`.
