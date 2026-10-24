1. In `memoize`, allocate a `WeakMap<This, Map<Arg, Return>>` and return a replacement function with a `this: This` parameter.
2. Inside the replacement, get or create the instance's map, return cached results, otherwise call `target.call(this, arg)`, store and return the result.
3. In `bound`, register an initializer with `context.addInitializer` that defines `context.name` on the instance as `target.bind(this)`.
4. In `clamp`, build a `limit` helper and return an object with `init` and `set` hooks; `set` forwards the limited value to `target.set.call(this, ...)`.
