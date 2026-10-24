A store needs three things: the current value, a `Set` of listeners, and a way to notify them. `useSyncExternalStore` takes care of subscribing and unsubscribing for you.
---
In `setState`: `const nextState = typeof next === 'function' ? next(state) : next;` then return early when `Object.is(nextState, state)`, otherwise assign and run `listeners.forEach((listener) => listener())`.
---
`subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }` and in the Hook: `return useSyncExternalStore(store.subscribe, () => selector(store.getState()));`.
