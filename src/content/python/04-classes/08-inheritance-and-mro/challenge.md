Repair the save chain in `main.py` so that behaviors combine through the MRO.

## The classes

- `Entity.save(log)` appends `"Entity"` to the list `log` and returns it (already written).
- `ValidationMixin`, `AuditMixin` and `TimestampMixin` subclass `Entity`. Each `save(log)` appends its label (`"Validation"`, `"Audit"`, `"Timestamp"`) and hands over to the **next class in the MRO** with zero-argument `super()`, returning the result.
- No method calls `Entity.save(...)` (or any `Entity.<method>`) directly, and no `super(...)` call passes arguments.

## `class Order`

Compose `Order` from the three mixins so that `Order().save([])` returns:

```py
["Validation", "Audit", "Timestamp", "Entity"]
```

`Entity` must run exactly once.

## `linearize(cls)`

Return the list of class names in `cls`'s method resolution order, from `cls` to `object`:

```py
linearize(Order)  # ["Order", "ValidationMixin", "AuditMixin", "TimestampMixin", "Entity", "object"]
```

The tests also compose the mixins in other orders with `type(name, bases, {})`, and check that a class whose bases contradict each other (`Entity` listed before one of its subclasses) cannot be created.
