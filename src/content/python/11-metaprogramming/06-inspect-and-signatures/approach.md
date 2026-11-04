1. Read a callable through its signature, never through its code object: the signature is what callers see after decorators, partials and `__call__` are taken into account.
2. Turn each parameter kind into a calling form: positional-only into the `args` list (with its default when the value is missing), named ones into `kwargs` only when a value is available, variadic ones skipped.
3. Decide "required" from `Parameter.empty` and fail before calling, with the parameter's name in the message, so the error says what the container lacks instead of what the function call broke.
4. Keep annotations unevaluated: under 3.14's lazy annotations, asking for their values can raise `NameError`, and the container only needs names.
5. For `public_api`, read raw class attributes with `inspect.getattr_static` so the descriptor types (`classmethod`, `staticmethod`, plain function) are still visible, and filter out everything that is not one of them.
6. For `is_async`, rely on code flags through `inspect.iscoroutinefunction`, which also unwraps partials and bound methods, and handle the one case it misses: an instance whose class has `async def __call__`.
