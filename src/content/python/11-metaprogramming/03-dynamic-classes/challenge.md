A reporting tool reads column names from a CSV header and needs a small value class per file. Write the class factory in `main.py`.

## `make_record_class(name, fields)`

Return a **new class** whose `__name__` and `__qualname__` are `name` and whose instances hold exactly the fields in `fields` (an iterable of strings, in order).

At creation time:

- A field that is not a valid identifier (`"2nd"`, `"unit price"`), is a keyword (`"class"`) or appears twice raises `ValueError`.

The class has:

- `__init__` accepting the fields by position, by keyword or both, like a function with one parameter per field. It raises `TypeError` for more positional values than fields, and for an unknown, missing or repeated field, with the field name in the message.
- `__repr__` returning `Name(field=value, ...)` with each value's `repr`, in field order: `LineItem(sku='A-1', quantity=3)`.
- `__eq__`: equal only to an instance of the **same class** with equal field values. Records never equal a plain tuple, unlike a `namedtuple`. Return `NotImplemented` for anything else.
- `__slots__` set to the field names, so instances have no `__dict__` and reject other attributes with `AttributeError`. Fields stay assignable.
- `__match_args__` set to the field names, so `case LineItem(sku, quantity):` works.

Build it with `type(name, bases, namespace)`. Returning `collections.namedtuple(...)` does not meet the contract: its instances are tuples.
