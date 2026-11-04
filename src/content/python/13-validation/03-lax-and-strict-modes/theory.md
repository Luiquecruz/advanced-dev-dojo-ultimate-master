By default Pydantic runs in **lax mode**: when the input is not of the declared type but has an unambiguous conversion, it converts. **Strict mode** turns the conversions off: the input must already be of the declared type.

```py
from pydantic import BaseModel, ConfigDict, StrictBool

class Order(BaseModel):
    quantity: int
    unit_price: float
    paid: StrictBool                     # strict for this field, even in a lax model

class InternalOrder(Order):
    model_config = ConfigDict(strict=True)   # strict for every field

print(Order.model_validate({"quantity": "2", "unit_price": "9.50", "paid": True}))
# quantity=2 unit_price=9.5 paid=True
InternalOrder.model_validate({"quantity": "2", "unit_price": 9.5, "paid": True})
# ValidationError: quantity  [type=int_type]
```

## Coming from TypeScript and JavaScript

Zod is strict by default and coercion is opt-in: `z.number().parse("2")` fails, `z.coerce.number().parse("2")` returns `2`. Pydantic is the opposite, lax unless told otherwise. The habit that breaks is assuming "it validated, so the client sent a number".

```ts
z.coerce.boolean().parse("false");   // true: Boolean("false") is truthy
z.stringbool().parse("false");       // false: Zod 4's explicit string-to-boolean parser
```

Pydantic's lax `bool` is closer to `z.stringbool()`: it accepts `True`/`False`, `0`/`1` and the strings `"true"`, `"false"`, `"yes"`, `"no"`, `"on"`, `"off"`, `"1"`, `"0"`, `"t"`, `"f"`, `"y"`, `"n"` in any case, and rejects `2` or `"maybe"` with `bool_parsing`. Convenient for query strings, dangerous for a flag that unlocks something.

## How it works

The conversion table of lax mode, for Python input (`model_validate`):

| Field | Also accepts in lax mode | Rejected |
| --- | --- | --- |
| `int` | `"42"`, `" 42 "`, `"4_2"`, `"3.0"`, `3.0`, `True`, `Decimal("4")` | `3.5` (`int_from_float`), `"1e3"` (`int_parsing`) |
| `float` | `3`, `"9.5"`, `True`, `"nan"`, `"inf"` | `"cheap"` (`float_parsing`) |
| `bool` | the strings and `0`/`1` above | `2`, `"maybe"` (`bool_parsing`) |
| `str` | `bytes` | `42`, `4.2`, `True` (`string_type`) |

Strict mode accepts the exact type only, with one deliberate exception: an `int` is accepted for a `float` field and becomes `3.0`. `True` is **not** an `int` in strict mode, although `bool` subclasses `int` in Python. The error types change too: lax reports `int_parsing` ("I tried and the text is not a number"), strict reports `int_type` ("this is not an int at all").

Three places switch strictness, from widest to narrowest:

- **Per call**: `Order.model_validate(data, strict=True)`.
- **Per model**: `model_config = ConfigDict(strict=True)`. A subclass merges its config with the parent's, so `extra="forbid"` is kept.
- **Per field**: `StrictInt`, `StrictBool`, `StrictStr`, `StrictFloat`, `Annotated[int, Strict()]` or `Field(strict=True)`. `Annotated[int, Strict(False)]` makes one field lax inside a strict model.

JSON input (`model_validate_json`) has its own table: in strict JSON mode a `datetime` field accepts an ISO 8601 string, because JSON has no date type, while strict Python mode wants a `datetime` object.

Pitfalls:

- Lax `float` accepts `"nan"` and `"inf"`, so a price can become NaN. Add `Field(allow_inf_nan=False)` or use `FiniteFloat`.
- Lax `int` accepts `True`, the bool-is-int trap of module 09, now hidden inside the library.
- A model that is lax for partners and strict internally is two models (or two calls), not one flag flipped at runtime.

## Legacy vs modern

Pydantic v1 coerced far more: `str` fields accepted `42` and returned `"42"`, and `int` fields truncated `3.5` to `3`. v2 removed both conversions, and added strict mode and the per-field `Strict` markers.

> **Status as of November 2026:** Strict mode, `ConfigDict(strict=True)` and the `Strict` marker behave as described from Pydantic 2.0 through the latest 2.14.2; this sandbox runs 2.12.5. Zod 4 (latest 4.6.7 on npm, October 2026) is strict by default and offers `z.coerce.*` and `z.stringbool()`. Sources: the Pydantic 2.12 docs "Strict Mode" and "Conversion Table" at pydantic.dev/docs/validation, pypi.org/project/pydantic, zod.dev.

## When to choose it

- **Lax** at edges where clients cannot send precise types: query strings, form posts, CSV rows, partner payloads that put numbers in strings.
- **Strict** for messages between your own services and for anything already parsed once: a type mismatch there is a bug to surface, not to paper over.
- **Per-field strict** for security-sensitive values in an otherwise lax model: payment and permission flags, amounts, identifiers whose string form has meaning (`"007"` is not `7`).
- Record in the code which mode each boundary uses; it is a contract, not a default to leave implicit.
