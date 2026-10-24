1. Store the list in a private `BehaviorSubject` so the latest value is always available and replayed.
2. Expose it with `asObservable()` and derive `remaining$` with `map`.
3. Keep an id counter and implement `add()` by emitting a new array.
4. Implement `toggle()` with `map` over the array, replacing only the matching todo with a copy.
5. In the component, render `todos()` with `@for` and wire the Add button and the `<li>` clicks to the store.
