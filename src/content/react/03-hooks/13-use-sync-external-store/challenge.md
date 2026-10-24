Build a tiny global store and a Hook to read it.

**`createStore(initialState)`** (named export) returns `{ getState, setState, subscribe }`:

- `getState()` returns the current state (already done).
- `setState(next)` accepts a new state **or** an updater function `(state) => nextState`. If the next state is `Object.is` equal to the current one, do nothing. Otherwise store it and call every listener.
- `subscribe(listener)` registers a listener and returns an **unsubscribe** function.

**`useStore(store, selector = (state) => state)`** (named export) returns the selected value using `useSyncExternalStore`:

- Components re-render when the store changes.
- A component re-renders **only** when its selected slice changes.
- Unmounting unsubscribes.

The default `App` shows `Cart: {items}` and an **Add to cart** button that updates a shared `cartStore`.
