Reading `obj.name` calls `type(obj).__getattribute__(obj, "name")`. The default, `object.__getattribute__`, checks data descriptors on the class, then the instance `__dict__`, then the rest of the class. Only when that raises `AttributeError` does Python call `__getattr__`, if the class defines one:

```py
class Settings:
    def __init__(self, **values):
        self.__dict__.update(values)

    def __getattr__(self, name):              # fallback: normal lookup already failed
        if name.startswith("feature_"):
            return False
        raise AttributeError(name)

settings = Settings(debug=True)
settings.debug                # True: found normally, __getattr__ never runs
settings.feature_search       # False: answered by the fallback
```

Writes and deletions have no fallback form: `__setattr__` and `__delattr__` run for **every** assignment and `del`, and `__dir__` answers `dir()`.

## Coming from TypeScript and JavaScript

A JavaScript `Proxy` wraps a target and its `get` trap sees every read. The trap receives the raw target, so reading through it does not re-enter the trap, and `Reflect.get` performs the default lookup:

```ts
const log: string[] = [];
const audited = new Proxy(order, {
  get(target, name, receiver) {
    log.push(String(name));
    return Reflect.get(target, name, receiver);
  },
});
```

The closest Python hook is `__getattribute__`, but it lives on the wrapper itself, and `self` is the wrapper:

```py
class Proxy:
    def __getattribute__(self, name):
        self.log.append(name)                # reads self.log: calls __getattribute__ again
        return getattr(self._target, name)   # RecursionError before anything is logged
```

Two fixes. Most proxies want `__getattr__`, which JavaScript has no equivalent for: it only sees names the wrapper does not own, so `self.log` and `self._target` are found normally. When you really need every read, reach your own state with `object.__getattribute__(self, "log")`, Python's `Reflect.get`.

## How it works

- **`__getattr__` must raise `AttributeError`** for unknown names. A `KeyError` escaping from it breaks `hasattr`, `getattr(obj, name, default)` and every library that probes attributes.
- **It runs on half-built objects.** `copy.copy` and `pickle` create the instance without calling `__init__` and then probe it for `__setstate__`. If the hook reads `self._defaults` there, that read fails, calls the hook again, and ends in `RecursionError`. Read your own state with `vars(self).get("_defaults", {})` or `object.__getattribute__`.
- **`__setattr__` runs inside `__init__` too.** A class that forwards or blocks writes stores its own attributes with `object.__setattr__(self, name, value)` (or `super().__setattr__`).
- **Implicit special method lookups skip both hooks.** `len(proxy)`, `proxy[0]`, `proxy + 1` and `with proxy:` look the dunder up on the type, so a proxy must define each one it should forward.
- **Modules have hooks too.** A module-level `def __getattr__(name)` and `def __dir__()` ([PEP 562](https://peps.python.org/pep-0562/)) answer missing module attributes, which is how libraries add lazy submodules and deprecation warnings.
- **Cost.** `__getattribute__` and `__setattr__` add a Python call to every access they cover. `__getattr__` costs nothing on the normal path.

`Object.seal` in JavaScript prevents adding and deleting properties while allowing updates. In Python, `__slots__` fixes the set of attribute names for a whole class; a `__setattr__`/`__delattr__` pair seals one instance after construction, which is what the challenge's `Frozen` does.

## When to choose it

- **`__getattr__`** for fallbacks: proxies, defaults, computed or lazy attributes. It is the safe default among the three.
- **`__setattr__`/`__delattr__`** to validate or freeze writes across the whole object. For one attribute, a property or descriptor is clearer.
- **`__getattribute__`** only when every access must be intercepted (tracing, access control), always with `object.__getattribute__` inside.
- **`__slots__` or a frozen dataclass** instead of hooks when the set of attributes is known when you write the class.
