A class statement is a call to `type(name, bases, namespace)`. Collect the methods as plain functions in a dict, add the class attributes, and pass the requested `name` as the first argument. The starter passes the literal `"Record"`, so every class it makes has the same name.
---
`__slots__` and `__match_args__` are ordinary entries in the namespace, and both take the tuple of field names. Slots must be there when `type()` runs: adding them to the class afterwards does nothing.
---
In `__init__(self, *args, **kwargs)`, zip the positional values with the field names first, then merge the keywords, raising `TypeError` for a key that is unknown or already filled. In `__eq__`, compare `type(other) is type(self)` and return `NotImplemented` otherwise, so a tuple on the other side never matches.
