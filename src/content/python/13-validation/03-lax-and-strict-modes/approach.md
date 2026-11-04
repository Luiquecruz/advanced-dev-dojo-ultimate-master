1. Run the demo with the starter and note which conversions lax mode makes on the partner payload, and that a forged `"paid": "yes"` is accepted.
2. Decide which fields must never be converted. `paid` releases a shipment, so it becomes `StrictBool` while the rest of the model stays lax.
3. Add strict mode for internal messages as configuration on a subclass, so the rule lives in one place and the parent's `extra="forbid"` carries over.
4. Point `parse_strict` at the strict model. Read the error types it produces (`int_type`, `float_type`, `bool_type`) and compare them with the lax ones (`int_parsing`, `float_parsing`).
5. Check the one conversion strict mode keeps: an `int` for a `float` field becomes a `float`. And check that `True` is no longer an `int`.
6. Write `coercions` by comparing types, not values, and let a `ValidationError` from invalid data propagate.
