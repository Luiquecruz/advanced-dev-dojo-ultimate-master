A service leaks data between requests: tags, registry entries and headers from one caller show up in the next. Fix the three definitions in `main.py`. `DEFAULT_HEADERS` is a module-level dict and must never change.

## `add_tag(tag, tags=None)`

Append `tag` to `tags` and return the list.

- Without a list, every call starts from a new empty list.
- With a list (even an empty one), append to **that** list and return it: `add_tag("c", empty) is empty`.

## `Registry(items=None)`

`Registry().items` is a new empty dict per instance. `Registry(seed)` copies `seed`, so `register(name, value)` never changes the caller's dict.

## `request(path, headers=<omitted>)`

Return `{"path": path, "headers": <dict>}` where the headers are:

- a **copy** of `DEFAULT_HEADERS` when the argument is omitted;
- `{}` when the caller passes `None` ("send no headers");
- a copy of the given dict otherwise.

Use a private sentinel object (`_UNSET = object()`) as the default so an omitted argument and `None` can be told apart.
