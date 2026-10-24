Add overload signatures so callers get precise types.

1. `lookupUser` must have two overloads:
   - `lookupUser(id: number): User | undefined` returns the user with that id from `users`, or `undefined`.
   - `lookupUser(ids: readonly number[]): User[]` returns the matching users in the given order, skipping unknown ids.
   Calling it with a `number | number[]` union must be a type error (only the overloads are public).
2. `makeDate` must accept **either** one argument (a timestamp) **or** three (`year, month, day`). Two arguments must be a type error. Keep the existing implementation.

```ts
lookupUser(2);          // { id: 2, name: 'Alan Turing' }   typed User | undefined
lookupUser([1, 3, 9]);  // [Ada, Grace]                     typed User[]
makeDate(2024, 0);      // type error
```
