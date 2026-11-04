1. Separate the two moments of a decorator: what runs once when `@` is applied, and what runs on every call inside the wrapper.
2. Write each wrapper as a pass-through first (`*args, **kwargs` in, the original result out), then add its one behavior.
3. Add `functools.wraps` to every wrapper and check `__name__`, `__wrapped__` and `inspect.signature` on a decorated function with defaults and keyword-only parameters.
4. For the stack, write `job = first(second(job))` on paper and trace a call: which wrapper is entered first, and where each `append` happens relative to the inner call.
5. Import the module fresh and confirm `ORDER` is still empty before the first call.
