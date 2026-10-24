Type a `getByPath` helper with dot paths.

1. `type Paths<T>`: the union of every dot path through `T`:
   - each string key is a path
   - when the value is a **plain object**, the key followed by `.` and every path of that object is also a
     path
   - arrays and functions are **leaves**: do not descend into them
2. `type Get<T, P extends string>`: the type at path `P` in `T`, or `never` when the path does not exist.
3. `function getByPath<T extends object, P extends Paths<T>>(source: T, path: P): Get<T, P>`: splits the path
   on `.` and reads each segment in turn.

```ts
const user = { name: 'Ada', address: { city: 'London', geo: { lat: 51.5 } }, tags: ['math'] };
getByPath(user, 'address.geo.lat'); // 51.5, typed as number
getByPath(user, 'address.zip');     // compile error
```

`any` is not allowed.
