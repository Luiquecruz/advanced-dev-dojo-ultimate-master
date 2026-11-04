Write the introspection helpers of a small dependency-injection container in `main.py`. Handlers declare what they need as parameters (`def list_orders(store, user, limit=10)`), and the container supplies values by name, the way pytest fixtures and FastAPI dependencies work.

## `call_with(function, available)`

Call `function` with the values from the mapping `available` whose names match its declared parameters, and return the result.

- Parameters missing from `available` keep their defaults. Extra entries in `available` are ignored. `*args` and `**kwargs` parameters receive nothing.
- Positional-only parameters (before `/`) are passed by position, every other parameter by keyword. A positional-only parameter that is missing but has a default is passed its default, so the ones after it stay in place.
- A required parameter missing from `available` raises `TypeError` whose message contains the parameter name. The function is not called.
- It works on decorated functions (`functools.wraps`), `functools.partial` objects and instances with `__call__`.
- Annotations are never evaluated: a parameter annotated with a class that does not exist yet (`user: User`) must not raise `NameError`. Python 3.14 evaluates annotations lazily, and `inspect.signature` evaluates them unless you pass `annotation_format=annotationlib.Format.FORWARDREF`.

## `public_api(cls)`

Return a list of `(name, kind)` tuples, sorted by name, for the public (no leading `_`) methods of `cls` and its bases. `kind` is `"method"`, `"classmethod"` or `"staticmethod"`. Properties, data attributes and nested classes are left out.

## `is_async(function)`

Return `True` when calling `function` would return a coroutine: an `async def` function or method, a `functools.partial` over one, or an instance whose class defines `async def __call__`. Return `False` for everything else, including classes and async generator functions. Never call `function` to find out.
