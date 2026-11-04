**Question this module answers:** when is it worth intercepting class creation, attribute access or imports, and what is the lightest hook that works?

## Prerequisites

Module 03 (decorators and `functools.wraps`), module 04 (`__new__` and `__init__`, descriptors and `__set_name__`, the MRO and cooperative `super()`) and module 09 (annotations at runtime).

## What a class statement runs

```py
@register
class Csv(Exporter, metaclass=Meta, name="csv"):
    delimiter = Field()
```

1. Python picks the most derived metaclass among `Meta` and `type(Exporter)`.
2. `Meta.__prepare__` returns the namespace (a plain `dict` by default).
3. The body runs inside that namespace.
4. `Meta.__new__` calls `type.__new__`, which builds the class, calls `Field.__set_name__(Csv, "delimiter")`, then `Exporter.__init_subclass__(name="csv")`.
5. `Meta.__init__` runs, then the decorator `register`, and only then is the name `Csv` bound.

## The hook ladder

| Need | Lightest hook | Where you meet it |
| --- | --- | --- |
| Adjust one function or class after it exists | decorator | `@dataclass`, `@functools.cache` |
| React to every subclass | `__init_subclass__` | plugin registries, checks on class attributes |
| Control one attribute | descriptor (`property`) | `cached_property`, ORM columns |
| Fallback for unknown attributes | `__getattr__` | proxies, lazy module attributes |
| Change how a class is built or called | metaclass | `enum.EnumType`, `abc.ABCMeta`, Django models |
| Change what `import` finds | finder on `sys.meta_path` | pytest's assertion rewriting |

Climb only as far as the problem needs. Each rung up is harder to read, harder for type checkers to follow, and harder to combine with other libraries.

## Coming from TypeScript and JavaScript

JavaScript customizes objects with `Proxy` and `Reflect`, `Object.defineProperty` and prototype edits, and TypeScript decorators run once on the class they decorate. Python's hooks are methods the interpreter calls at fixed moments: the class statement, attribute lookup, the `import` statement. The habit to drop is reaching for the strongest tool first, such as a metaclass, `__getattribute__` or a patched `sys.modules`, when a lower rung already does the job.

> **Status as of November 2026:** this track runs CPython 3.14 in Pyodide. Since 3.14 annotations are evaluated lazily (PEP 649 and PEP 749), so a metaclass no longer finds `__annotations__` in the class namespace; `annotationlib.get_annotate_from_class_namespace()` (new in 3.14) returns the function that computes them.

## The path

`__init_subclass__` registries, classes built at runtime with `type()`, attribute hooks, metaclasses, `inspect` and signatures, and the finders and loaders behind `import`.

## When to choose it

The module ends with the import system challenge, not an ADR. The decision it trains: start with a decorator or `__init_subclass__`, use descriptors for per-attribute rules, and keep metaclasses and import hooks for frameworks that must change how classes are called or where modules come from.
