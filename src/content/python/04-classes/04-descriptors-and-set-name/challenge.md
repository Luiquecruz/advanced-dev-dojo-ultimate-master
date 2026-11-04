Build reusable attribute rules in `main.py` in two steps.

## Step 1: data and non-data descriptors

### `class Positive`

A **data descriptor** used as `price = Positive()` in a class body.

- Assigning a value `<= 0` raises `ValueError`.
- Each instance of the owner class keeps its **own** value: two products with prices 3 and 50 read back 3 and 50.
- Accessing it on the class (`Product.price`) returns the `Positive` object itself.

The starter stores the value on the descriptor. Fix it.

### `class LazyAttribute(function)`

A **non-data descriptor** (only `__get__`) used as a decorator on a method without arguments.

- The first read on an instance calls `function(instance)` and caches the result in that instance's `__dict__` under the attribute name; later reads do not call the function again.
- Assigning to the attribute replaces the cached value.
- Each instance computes its own value once. Class access returns the `LazyAttribute` object.

## Step 2: `__set_name__` and a model base

### `class Field(min_value=None, max_value=None)`

A data descriptor validating an **inclusive** range (`None` means no limit), storing values on the instance.

- Implement `__set_name__(owner, name)` so the descriptor knows its attribute name.
- Values out of range raise `ValueError` whose message **contains the attribute name** (`"quantity"`, `"discount"`).
- A rejected write keeps the previous value.

### `class Model`

The base class for models that declare `Field`s. `Model(**values)` assigns each keyword through its field and raises `TypeError` for unknown names (already written).

- Classmethod `fields()` returns the names of the `Field` descriptors of the class **and its bases**, in definition order, base fields first.
- `Model.fields()` is `[]`, and two unrelated models never share fields.
