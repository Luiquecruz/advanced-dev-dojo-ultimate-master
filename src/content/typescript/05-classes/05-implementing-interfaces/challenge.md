Implement an in-memory cache that satisfies two interfaces and a constructor contract. The interfaces are
already declared; do not change them.

1. `class MemoryCache implements Cache, Serializable`, storing entries in a private `Map<string, string>`.
   - `constructor(initial: Record<string, string> = {})` — preloads every entry of `initial`
   - `get(key)` returns the value or `undefined`
   - `set(key, value)` stores or replaces a value
   - `has(key)` and `size()` behave like the `Map` methods
   - `serialize()` returns a JSON object string of all entries, e.g. `'{"a":"1","b":"2"}'`
2. Declare `const CacheClass: CacheConstructor = MemoryCache;` to check the constructor side.

Annotate every method parameter: `implements` does not type them for you.
