Finish the types of a chainable configuration builder. The runtime structure is already there.

1. `type Simplify<T>`: flattens an intersection into a single object type, so
   `Simplify<{ a: 1 } & { b: 2 }>` is exactly `{ a: 1; b: 2 }`.
2. `interface Chainable<T = {}>`:
   - `option<K extends string, V>(key, value: V)` returns `Chainable<T & Record<K, V>>`
   - `key` must be rejected at compile time when `K` is already a key of `T`
   - `get()` returns `Simplify<T>`
3. Update `createChainable` so that it implements the new generic `option`. Every call must return a
   **new** builder; previous builders keep their own state.

```ts
const config = createChainable().option('name', 'app').option('port', 3000).get();
// { name: string; port: number }
createChainable().option('name', 'app').option('name', 'again'); // compile error
```
