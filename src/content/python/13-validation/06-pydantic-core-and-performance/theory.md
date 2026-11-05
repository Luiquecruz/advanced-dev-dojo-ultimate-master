Pydantic is two packages. **`pydantic`** is Python: when a model class is created, it reads the annotations, `Field`s, validators and config, and compiles them into a **core schema**, a plain dict describing every check. **`pydantic-core`** is a compiled extension module: it turns that schema into a `SchemaValidator` and a `SchemaSerializer`, which do the per-call work.

```py
from pydantic import BaseModel, TypeAdapter

class Item(BaseModel):          # schema built and compiled here, once, at import time
    sku: str
    quantity: int

print(type(Item.__pydantic_validator__).__name__)    # SchemaValidator
print(Item.__pydantic_core_schema__["type"])         # model

ITEMS = TypeAdapter(list[Item])                      # same machinery for any type, built once
items = ITEMS.validate_json('[{"sku": "A", "quantity": "2"}]')
print(items, ITEMS.json_schema()["type"])            # [Item(sku='A', quantity=2)] array
```

The cost model follows: **building** a validator is expensive (Python code walking annotations), **using** it is cheap (compiled code).

## Two costly habits

A validator built inside a handler is rebuilt on every request:

```py
def handle(body: bytes) -> list[Item]:
    return TypeAdapter(list[Item]).validate_json(body)   # rebuilds the validator on every request
```

Create `TypeAdapter`s at module level, like models, and reuse them. The second habit is `model_validate(json.loads(body))`: JSON is parsed into Python dicts and lists, then walked again. `model_validate_json(body)` parses and validates in one pass inside pydantic-core (the docs note exceptions when the model has `before` or `wrap` validators).

## Where the time goes

- **Python validators** (`field_validator`, `model_validator`) call back from the compiled core into Python for every value they touch; a field validator on each of 100 000 list items is 100 000 Python calls. Declarative constraints (`Field(gt=0)`, `pattern=`) stay in compiled code. `wrap` validators are the slowest, since they materialize the data in Python.
- **Serialization** is compiled too: `model_dump_json()` writes JSON directly, while `json.dumps(model.model_dump(mode="json"))` builds an intermediate dict first.
- **Shapes matter.** The performance guide recommends concrete `list`/`dict` over `Sequence`/`Mapping`, discriminated unions over plain unions, `TypedDict` over nested models when you do not need model instances (about 2.5× faster in its benchmark), and `FailFast()` to stop a list at its first bad item.
- **`model_construct()`** skips validation entirely. It is the fast path for data you validated earlier (a row your own service wrote); on request data it is the security hole of lesson 02.
- In most services Pydantic is not the bottleneck: the network and the database are. Profile before tuning.

## Alternatives

- **Dataclasses** (stdlib): no validation, no dependency; right for internal objects. `TypeAdapter(MyDataclass)` can still validate one at a boundary.
- **attrs** (with **cattrs** for structuring): classes with optional validators and converters, written in Python, older and smaller than Pydantic.
- **msgspec**: `Struct` types plus very fast JSON and MessagePack decoding with type checks, in C, with fewer customization hooks than Pydantic.
- **A contract shared with clients written in other languages**: publish the model's JSON Schema and generate their types from it, instead of writing both sides by hand.

## In this sandbox

`pydantic-core` runs here compiled to WebAssembly, loaded only by lessons that import Pydantic: the first such run downloads about 1.8 MB of wheels from this site and took about a second when measured. Timings in this sandbox are not representative of native CPython, so this lesson is a quiz.

> **Status as of November 2026:** The latest Pydantic is 2.14.2 (29 October 2026), which requires exactly pydantic-core 2.50.2 and Python 3.10 or newer; this sandbox runs 2.12.5 with pydantic-core 2.41.5 (Pyodide 314.0.7). Since 2.13 (beta February 2026) the pydantic-core source lives inside the main pydantic repository, and since 2.14.0a1 pydantic-core publishes wheels for Pyodide 314 (`pyemscripten_2026_0`). Related libraries on PyPI: msgspec 0.22.0 (September 2026), attrs 26.1.0, cattrs 26.2.1. Sources: pypi.org/project/pydantic, pypi.org/project/pydantic-core, the Pydantic changelog and the Pydantic 2.12 "Performance" and "Architecture" docs at pydantic.dev/docs/validation.

## When to choose it

- **`BaseModel`** when you want instances with methods, config, validators and a schema; **`TypeAdapter`** for lists, dicts, `TypedDict`s and dataclasses at a boundary, created once.
- **`model_validate_json` / `model_dump_json`** on the hot path of an API.
- **Dataclasses** inside the service, **msgspec** when a measured decode cost dominates and its type system is enough.
- Measure on native CPython with realistic payloads before trading readability for speed.
