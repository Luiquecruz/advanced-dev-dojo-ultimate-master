Start with `class MemoryCache implements Cache, Serializable { ... }` and let the compiler list the missing members.
---
Store the entries in a field such as `#entries: Map<string, string>` and build it in the constructor with `new Map(Object.entries(initial))`.
---
`serialize()` can be `JSON.stringify(Object.fromEntries(this.#entries))`. After the class, add `const CacheClass: CacheConstructor = MemoryCache;`.
