Write three small classes in `main.py`, each built on one attribute hook.

## `class Proxy(target)`

An auditing wrapper around any object.

- Reading a name the proxy does not own returns `getattr(target, name)`. A name the target lacks raises `AttributeError`.
- Assigning any attribute on the proxy (`proxy.status = "paid"`) sets it **on the target**; the proxy's own `__dict__` never gains it.
- `log` is the proxy's own list. Every forwarded read appends `("get", name)` and every forwarded write appends `("set", name)`, in order. Reading `proxy.log` itself is not logged.
- `dir(proxy)` includes the target's names (`"total"`, `"add"`) and the proxy's own (`"log"`).

## `class Frozen`

A base class for objects whose shape must stop changing.

- Before `freeze()` the instance behaves like any object.
- After `freeze()`, assigning an attribute that neither the instance nor its class already has raises `AttributeError` whose message contains the attribute name (a typo like `config.hots = ...`). Existing attributes stay writable, including a class-level default such as `timeout = 30` that the instance overrides after `freeze()`.
- After `freeze()`, deleting any attribute raises `AttributeError`.

## `class Defaults(defaults, **values)`

Stores a copy of the `defaults` mapping and sets each keyword in `values` as a normal attribute (already written).

- A name found by normal lookup (an instance attribute, a class attribute, a method) is never answered from the defaults.
- A missing name is answered from the defaults; a name absent from both raises `AttributeError`, so `hasattr` and `getattr(obj, name, fallback)` work.
- `copy.copy(obj)` works and keeps both the values and the defaults. `copy` creates the new instance without calling `__init__` and then probes it for hooks such as `__setstate__`.
