`paid: StrictBool` makes one field strict inside a lax model; `Annotated[bool, Strict()]` and `Field(strict=True)` say the same thing. The other fields stay lax, so partners can keep sending `"17"`.
---
A subclass can add configuration: `model_config = ConfigDict(strict=True)` on `StrictOrder` merges with the parent's `extra="forbid"`. Then `StrictOrder.model_validate(data)` refuses every conversion. Checking attributes after a lax parse cannot work: by then `"17"` is already `17`.
---
For `coercions`, validate once, then walk `data.items()` and compare `type(raw)` with `type(getattr(order, name))`. Comparing values misses two conversions: `3 == 3.0` and `True == 1` are both `True` in Python.
