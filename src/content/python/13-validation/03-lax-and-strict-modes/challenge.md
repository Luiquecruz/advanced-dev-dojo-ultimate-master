# One order, two trust levels

Partners post orders with numbers in strings (`"17"`, `"9.50"`) and flags such as `"yes"`. The same order then travels between your own services, where a string in a numeric field means a bug. One flag is special everywhere: `paid` releases the shipment, so it must be a real boolean even from partners.

Implement in `main.py`:

## `class Order(BaseModel)`

`model_config = ConfigDict(extra="forbid")` and these fields:

| Field | Type | Default |
| --- | --- | --- |
| `order_id` | `int` | required |
| `quantity` | `int` | required |
| `unit_price` | `float` | required |
| `express` | `bool` | `False` |
| `paid` | strict boolean (`StrictBool`) | required |

So lax mode converts the first four, but `paid` rejects `"true"`, `1` or `"yes"` with error type `bool_type`.

## `class StrictOrder(Order)`

A subclass that turns on strict mode for every field through `model_config` (`ConfigDict(strict=True)`), keeping the parent's `extra="forbid"`.

## Functions

- `parse_lax(data)`: returns an `Order` validated in lax mode.
- `parse_strict(data)`: returns a `StrictOrder`; nothing is converted, except an `int` for a `float` field, which strict mode allows.
- `coercions(data)`: validates `data` in lax mode and returns a dict `{field: (input_type_name, output_type_name)}` for every field **present in `data`** whose Python type changed, using `type(...).__name__` (for example `{"order_id": ("str", "int")}`). Compare types, not values: `3 == 3.0` and `True == 1`. Invalid data raises `ValidationError`.

Both parse functions raise `pydantic.ValidationError`; the tests read `errors()` (`loc` and `type`), never the message text.
