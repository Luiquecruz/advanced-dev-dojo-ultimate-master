**Question this module answers:** what do annotations promise, who checks them, and what happens to them at runtime?

## Annotations are metadata

```py
def ship(order_id: int, express: bool = False) -> str:
    return f"shipped {order_id}"

print(ship("A-17"))          # shipped A-17: nothing checks the call
print(ship.__annotations__)  # {'order_id': <class 'int'>, 'express': <class 'bool'>, 'return': <class 'str'>}
```

The interpreter **never enforces** an annotation. It stores it as an ordinary object on the function, class or module, and moves on. Two very different consumers read it:

- A **static type checker** (mypy, pyright, ty, pyrefly) reads the source without running it and reports `ship("A-17")` as an error. It runs in the editor and in CI, never inside your program.
- **Runtime code** reads the annotation objects: `dataclasses` builds `__init__` from them, validation and web libraries turn them into parsers and schemas, and `typing.get_type_hints` resolves them for you.

Python typing is **gradual**: unannotated code is treated as `Any` by a checker, so a project adds types file by file and turns on stricter flags as coverage grows.

## Coming from TypeScript and JavaScript

- TypeScript types are **erased**: `tsc` checks them and the emitted JavaScript holds none. Python keeps annotations as runtime objects, but nothing checks them unless a checker runs in your pipeline. The habit that breaks is trusting a signature as if a compiler had enforced it.
- TypeScript is **structural** everywhere: any object of the right shape fits an `interface`. Python classes are **nominal** by default, so `isinstance` follows inheritance; structural typing is opted into with `Protocol`.
- There is no `tsc` here: **no type checker runs in this sandbox**. Every challenge in this module asserts what runtime code can see (`get_type_hints`, `__type_params__`, TypedDict key sets, runtime-checkable protocols, registered overloads) or builds a small consumer of annotations.

## The path

1. Modern annotation syntax: builtin generics, `X | None`, `Callable`, `Self`.
2. Generics with PEP 695: `def first[T]`, `class Stack[T]`, `type` aliases.
3. Protocols: structural typing, opt-in.
4. `TypedDict` and `Literal`, with a runtime validator.
5. Overloads and narrowing: `@overload`, `TypeIs`, `assert_never`.
6. Runtime annotations: deferred evaluation in Python 3.14, `annotationlib`, a schema builder.
7. How typing evolved and which checker to run.
8. An ADR for the typing strategy of a public SDK.

## When to choose it

Study this module before you publish a library, design a plugin API or validate external data. Its closing decision: which interface style plugins implement (protocol, ABC or base class), how payloads are typed (TypedDict, dataclass or plain dict), where runtime validation happens, which generics syntax the baseline allows, and which checker guards it all in CI.
