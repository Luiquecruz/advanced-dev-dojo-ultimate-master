Use `as` clauses in mapped types to rename and filter keys.

1. `type Getters<T>`: for every string key `k` of `T`, a property `get` + capitalized `k` holding a function
   with no parameters that returns `T[k]`. Symbol keys are ignored.
2. `type PickByValue<T, V>`: keeps only the properties of `T` whose value type is assignable to `V`.
3. `type EventHandlers<E extends { type: string }>`: for each member of the event union `E`, a property
   `on` + capitalized `type` holding `(event: <that exact member>) => void`.
4. `function createGetters<T extends object>(source: T): Getters<T>`: returns an object with one getter
   function per own string key of `source`; each getter returns the **current** value of
   `source[key]` when called.

```ts
const getters = createGetters({ name: 'Ada', age: 36 });
getters.getName(); // 'Ada'
```

`any` is not allowed.
