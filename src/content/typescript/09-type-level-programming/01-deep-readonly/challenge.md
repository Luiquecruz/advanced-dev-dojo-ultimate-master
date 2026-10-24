Implement the deep versions of `Readonly` and `Partial`, then a runtime `deepFreeze` that matches them.

1. `type DeepReadonly<T>`:
   - every property at every depth becomes `readonly`
   - arrays become readonly arrays and tuples become readonly tuples, with elements transformed recursively
   - function types are kept **unchanged** (still callable)
   - primitives are unchanged
2. `type DeepPartial<T>`:
   - every property of every nested **plain object** becomes optional
   - arrays (and tuples) and function types are kept unchanged
   - primitives are unchanged
3. `function deepFreeze<T>(value: T): DeepReadonly<T>`: recursively calls `Object.freeze` on every nested
   object and array, and returns the **same** reference.

`any` and the built-in `Readonly`/`Partial` helpers are not allowed.
