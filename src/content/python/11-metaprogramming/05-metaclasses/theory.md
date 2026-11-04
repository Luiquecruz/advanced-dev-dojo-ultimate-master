Classes are objects, and their type is their **metaclass**. `type` is the default one. A metaclass is a subclass of `type` whose methods run at two moments: when a class statement builds a class, and when that class is called.

```py
class Tracing(type):
    def __new__(mcls, name, bases, namespace, **kwargs):
        print("creating", name)
        return super().__new__(mcls, name, bases, namespace, **kwargs)

    def __call__(cls, *args, **kwargs):
        print("calling", cls.__name__)
        return super().__call__(*args, **kwargs)

class Job(metaclass=Tracing):    # prints "creating Job"
    pass

job = Job()                      # prints "calling Job"
type(job) is Job, type(Job) is Tracing, type(Tracing) is type   # True, True, True
```

Subclasses inherit the metaclass, so `class Nightly(Job)` is built by `Tracing` too.

## Coming from TypeScript and JavaScript

JavaScript has no class of classes. Class-level rules end up in the constructor, which only runs when an instance is created:

```ts
class Settings {
  static #instance?: Settings;
  values!: Map<string, string>;
  constructor() {
    if (Settings.#instance) return Settings.#instance;   // early return: the rest is skipped
    Settings.#instance = this;
    this.values = loadValues();
  }
}
class Money {
  constructor() { if (new.target !== Money) throw new TypeError("Money is final"); }
}
```

Both habits break in Python. The singleton translates to `__new__` returning a cached instance, but `type.__call__` runs `__init__` on whatever `__new__` returns when it is an instance of the class, so the state is reset on every call:

```py
class Settings:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        self.values = load_values()    # runs again on every Settings() call
```

And a `new.target`-style check in `__init__` lets `class Points(Money)` be defined and fails later, far from the mistake. A metaclass controls the call itself (`__call__`) and rejects the class statement itself (`__new__`).

## How it works

A class statement runs `Meta.__prepare__(name, bases, **kwargs)` to get the namespace, executes the body in it, then calls `Meta(name, bases, namespace, **kwargs)`: `Meta.__new__` builds the class through `type.__new__` (which runs `__set_name__` and `__init_subclass__`), and `Meta.__init__` finishes it.

- **`__prepare__`** may return any mapping. `enum` uses this to reject a member defined twice; a `dict` subclass whose `__setitem__` raises on a repeated key does the same for methods.
- **Always call `super().__new__(mcls, name, bases, namespace, **kwargs)`** with the namespace you received. It carries `__classcell__`, which zero-argument `super()` inside methods needs; dropping it raises `RuntimeError`.
- **`__call__`** decides what `Cls(...)` returns. `type.__call__` calls `cls.__new__`, then `__init__` when the result is an instance of `cls`.
- **Methods on the metaclass** are callable on the class but invisible from instances. `Color["RED"]`, `len(Color)` and iterating over an enum come from `enum.EnumType`.
- **One metaclass per class.** Python picks the most derived metaclass among the explicit one and those of all bases; if none derives from all the others, the class statement raises `TypeError: metaclass conflict`. The fix is `class Combined(MetaA, MetaB)`, which only works when every metaclass method calls `super()`. This is the real cost: `abc.ABCMeta`, `enum.EnumType` and framework metaclasses do not mix with yours unless you derive from theirs.

> **Status as of November 2026:** this track runs CPython 3.14, where annotations are evaluated lazily (PEP 649 and PEP 749). A metaclass `__new__` no longer finds `__annotations__` in the namespace of a class with annotations; call `annotationlib.get_annotate_from_class_namespace(namespace)` (new in 3.14) and pass the result to `annotationlib.call_annotate_function` with `Format.FORWARDREF`, so names defined later in the module do not fail.

## When to choose it

- **A metaclass** when you must change what calling the class does, supply the namespace with `__prepare__`, or give classes their own operators (`Registry["csv"]`, `len(Color)`).
- **`__init_subclass__`** for checks on subclasses: a required `name` or a final class (`raise TypeError` in the base's hook) need no metaclass. **`typing.final`** marks a class final for type checkers only.
- **A module-level instance** or a `functools.cache` factory for a singleton in application code; reach for `SingletonMeta` only when `Settings()` must keep working for callers.
- Avoid metaclasses in libraries meant to be mixed with others: every user who also inherits from an ABC or an enum pays the conflict.
