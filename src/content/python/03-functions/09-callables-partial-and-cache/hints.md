An object is callable when its class defines `__call__(self, value)`. Store the steps as a tuple, and in `then` build `Pipeline(*self._steps, step)` instead of appending to the existing steps.
---
Decorate the fallback with `@singledispatch`, then add handlers with `@render.register` on functions whose first parameter is annotated (`value: int`, `value: list`). Inside the list handler, call `render(item)` so nested values dispatch too.
---
The cache and the property are one decorator each: `@lru_cache(maxsize=2)` above `exchange_rate` and `@cached_property` instead of `@property` on `total`. Check the cache with `exchange_rate.cache_info()`.
