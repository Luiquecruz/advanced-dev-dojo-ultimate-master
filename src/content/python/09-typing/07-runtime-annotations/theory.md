Since Python 3.14, annotations are **evaluated lazily** (PEP 649, implemented by PEP 749). The compiler turns them into a hidden `__annotate__` function; nothing is evaluated when `def` or `class` runs, and the first read of `__annotations__` calls it. A class can therefore name another class defined further down, without quotes:

```py
import annotationlib
from dataclasses import dataclass

@dataclass
class Invoice:
    customer: Customer          # defined below: fine in 3.14
    total: float

@dataclass
class Customer:
    name: str

print(Invoice.__annotations__)  # {'customer': <class '__main__.Customer'>, 'total': <class 'float'>}

class Draft:
    owner: Reviewer             # never defined

print(annotationlib.get_annotations(Draft, format=annotationlib.Format.STRING))   # {'owner': 'Reviewer'}
Draft.__annotations__           # NameError: name 'Reviewer' is not defined
```

## Coming from TypeScript and JavaScript

TypeScript erases types, so runtime schemas are written twice: once as an `interface` and once for a validator such as zod, or recovered through `reflect-metadata`, which only yields constructors (`Array`, `Object`) without element types:

```ts
interface Line { sku: string; quantity: number }
const LineSchema = z.object({ sku: z.string(), quantity: z.number() });   // the same facts again
```

In Python the annotation objects are the full type expressions (`list[Line]`, `str | None`), so one class can drive the schema, which is what `dataclasses`, FastAPI and Pydantic do. The habit that breaks is reading a captured type the way reflection metadata is read: `dataclasses.fields(cls)[i].type`, or `cls.__annotations__`, assuming it is always a resolved class. In 3.14 `@dataclass` records the types in the `FORWARDREF` format when the decorator runs, so `fields(Invoice)[0].type` stays `ForwardRef('Customer')` even after `Customer` exists. Code written for older Pythons may hold plain strings (`"int"`). Ask for resolved types at the moment you need them: `typing.get_type_hints(cls)`.

## How it works

`annotationlib.get_annotations(obj, format=...)` (new in 3.14) asks the annotate function for one of three formats:

| Format | Returns | Undefined names |
| --- | --- | --- |
| `Format.VALUE` (default, what `__annotations__` gives) | evaluated objects | raise `NameError` |
| `Format.FORWARDREF` | objects, with `ForwardRef('Name')` placeholders | never raise |
| `Format.STRING` | source text such as `'list[Reviewer] \| None'` | never raise |

`typing.get_type_hints(obj)` builds on the `VALUE` format and adds what a consumer usually wants: it evaluates string annotations (quoted ones and those produced by `from __future__ import annotations`) in the module's globals, merges the annotations of base classes, turns `None` into `NoneType` and strips `Annotated` extras.

A schema builder then walks each resolved annotation: a plain class (`str`, `int`) maps to a JSON type; `typing.get_origin(list[Line])` is `list` and `typing.get_args` gives `(Line,)`; for `str | None`, `get_origin` is `typing.Union` and the arguments include `NoneType`; a dataclass recurses. Whether a field is **required** is a separate question answered by `dataclasses.fields`: a field without `default` and without `default_factory` must be present, even when it may be `None`.

Pitfalls:

- Evaluation happens on access, so a name that is never defined raises only when someone reads the annotations. Build schemas after the module has finished executing, never in the middle of its class definitions.
- `get_type_hints` evaluates strings: never call it on classes from untrusted source code.
- `bool` subclasses `int`; look scalar types up exactly (`SCALARS[annotation]`) instead of with `issubclass`.

## Legacy vs modern

- Before 3.14, annotations were evaluated eagerly, so forward references needed quotes: `customer: "Customer"`.
- `from __future__ import annotations` (PEP 563, 3.7) stored every annotation as a string instead; tools then had to call `get_type_hints` to turn them back into objects.
- 3.14 makes laziness the default and keeps both old styles working: `get_type_hints` handles real objects and strings alike.

> **Status as of November 2026:** PEP 749 keeps `from __future__ import annotations` working in 3.14 and plans to deprecate it no sooner than the first release after Python 3.13 reaches end of life, then remove it at least two releases later. `annotationlib` is new in 3.14, and this sandbox runs CPython 3.14 (Pyodide).

## When to choose it

- **`typing.get_type_hints`** whenever runtime code consumes annotations: validators, serializers, dependency injection, CLI builders.
- **`annotationlib.get_annotations(format=Format.STRING)`** for documentation or error messages that must not evaluate anything, and `FORWARDREF` for tools that run before every name exists.
- **Drop the quotes and the `__future__` import** in code that requires 3.14; keep them while you still support older versions.
- **A library** (Pydantic, msgspec, cattrs) once schemas need aliases, coercion or versioning; the mechanism is the same one you build here.
