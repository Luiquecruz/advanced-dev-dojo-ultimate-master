Implement four dictionary helpers in `main.py`.

## `invert(mapping)`

Return a dict from each **value** of `mapping` to the **set of keys** that had it. `{"u1": "admin", "u2": "admin", "u3": "guest"}` becomes `{"admin": {"u1", "u2"}, "guest": {"u3"}}`. `mapping` is not modified.

## `group_by(items, key)`

Return a dict from `key(item)` to the **list of items** with that key. Items keep their original order inside each list. `items` may be a generator, so read it only once.

## `shared_keys(first, second)`

Return the keys present in both dicts as a **set**, using the keys views and their set operators.

## `live_keys(mapping)`

Return the `keys()` **view** of `mapping` itself (not a copy): keys added to `mapping` later must show up in the returned view.
