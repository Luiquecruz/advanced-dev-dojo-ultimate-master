Overload signatures are declarations without a body, written directly above the implementation: `function lookupUser(id: number): User | undefined;`.
---
Inside the implementation, narrow with `typeof idOrIds === 'number'`. In the other branch `idOrIds` is the array.
---
For the array case, map every id to the users that match and flatten: `idOrIds.flatMap((id) => users.filter((user) => user.id === id))`. For `makeDate`, add `(timestamp: number): Date` and `(year: number, month: number, day: number): Date` overloads.
