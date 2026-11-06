`inspect.signature(callable)` describes what a callable accepts: an ordered mapping of `Parameter` objects, each with a `name`, a `kind`, a `default` and an `annotation`. Frameworks read it to decide what to pass. pytest injects fixtures by parameter name, and FastAPI builds request parsing from handler signatures.

```py
import inspect

def connect(host, /, port=5432, *, ssl=True):
    ...

signature = inspect.signature(connect)
[(p.name, p.kind.name) for p in signature.parameters.values()]
# [('host', 'POSITIONAL_ONLY'), ('port', 'POSITIONAL_OR_KEYWORD'), ('ssl', 'KEYWORD_ONLY')]

bound = signature.bind("db", ssl=False)    # same rules as a call, nothing is executed
bound.apply_defaults()
bound.arguments                            # {'host': 'db', 'port': 5432, 'ssl': False}
```

## How it works

**Kinds decide the calling form.** `POSITIONAL_ONLY` (before `/`) must be passed by position, `KEYWORD_ONLY` (after `*`) by name, and `POSITIONAL_OR_KEYWORD` either way. `VAR_POSITIONAL` and `VAR_KEYWORD` are `*args` and `**kwargs`. `Parameter.empty` marks a missing default or annotation.

**Lazy annotations.** Since 3.14 annotations are evaluated when someone asks for them, and `inspect.signature` asks by default. A handler annotated with a class defined later in the module raises `NameError`:

```py
from annotationlib import Format

def handler(request: Request) -> Response: ...      # Request is defined further down

inspect.signature(handler)                                      # NameError
inspect.signature(handler, annotation_format=Format.FORWARDREF) # (request: Request) -> Response
```

Code that only needs names should pass `annotationlib.Format.FORWARDREF` (or `STRING`).

**Attributes without side effects.** `getattr(cls, name)` runs the descriptor protocol: a `classmethod` comes back as a bound method and a `staticmethod` as a plain function, so you cannot tell them apart from regular methods. `inspect.getattr_static` and `inspect.getmembers_static` return the raw objects without running descriptors or `__getattr__`. `inspect.getmembers` calls `getattr` on every name, which on an instance also runs every property.

**Coroutine functions.** `inspect.iscoroutinefunction` checks the code flags of `async def` functions, through partials and bound methods, and honors `inspect.markcoroutinefunction`. It returns `False` for async generator functions and for an instance whose class has `async def __call__`: check `type(obj).__call__` for those. A plain wrapper that returns a coroutine is not detected either, which is why async-aware decorators are written as `async def`. Never call a function to find out: the coroutine it creates is never awaited, and its side effects already happened.

**Cost.** `inspect.signature` builds a new `Signature` object on every call, unwrapping decorators each time. Containers compute it once per function and cache it.

This track runs CPython 3.14. Python 3.14 added the `annotation_format` parameter to `inspect.signature` and deprecated `asyncio.iscoroutinefunction()`, which is scheduled for removal in Python 3.16; use `inspect.iscoroutinefunction()`.

## Common mistakes

**Reading parameter names from the code object.** `__code__` describes the function body that runs, not the callable a caller sees, and it breaks in three ways: a `functools.wraps` decorator leaves the wrapper's `(*args, **kwargs)`, a `functools.partial` or a callable object has no `__code__` at all, and `co_argcount` leaves keyword-only parameters out.

```py
# wrong: AttributeError on partials and callable objects, () after a (*args, **kwargs) decorator
code = handler.__code__
names = code.co_varnames[: code.co_argcount]

# right: follows __wrapped__, unwraps partials and bound methods, reads __call__ on instances
signature = inspect.signature(handler, annotation_format=Format.FORWARDREF)
names = [parameter.name for parameter in signature.parameters.values()]
```

## When to choose it

- **Signature-based injection** inside frameworks, plugin hosts and test runners, where the callable is written by someone else and the caller adapts to it.
- **`Signature.bind`** to validate arguments, or to normalize them for logging and caching, without calling the function.
- **`getattr_static`** whenever introspection must not trigger properties, lazy attributes or `__getattr__`.
- **Explicit arguments** in application code: if you wrote both sides of the call, injection by name only hides the dependency.
