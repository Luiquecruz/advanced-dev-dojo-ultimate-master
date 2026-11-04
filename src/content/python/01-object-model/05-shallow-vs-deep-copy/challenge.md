Write three helpers for configuration dictionaries in `main.py`. Configuration values can be nested dicts and lists.

## `clone_config(config, **overrides)`

Return a **deep copy** of `config` with the keyword `overrides` applied at the top level (override values are used as given).

- Changing nested dicts or lists of the clone never changes `config`.
- A configuration that contains itself (`config["self"] = config`) is cloned with the cycle intact: `clone["self"] is clone`.

## `with_defaults(config, defaults)`

Return a **new** dict with every key of `defaults`, replaced by the values in `config` where present.

- The result shares no mutable object with `defaults` or `config`: appending to `result["tags"]` must not change `defaults["tags"]`.

## `diff_shared(first, second)`

A diagnostic helper. Return the **sorted list of keys** that exist in both dicts and whose values are the **same mutable container object** (`is`), where a container is a `list`, `dict` or `set`. Scalars such as strings and numbers are ignored.

Use the standard library module `copy`.
