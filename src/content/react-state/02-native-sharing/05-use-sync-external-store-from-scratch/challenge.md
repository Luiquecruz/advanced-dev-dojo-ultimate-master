`createStore` (done) is a tiny external store with `getState`, `getInitialState`, `setState(partial | updater)` (shallow merge) and `subscribe`. The naive `useStore` hook works for primitive selectors, but the `OpenTodos` component, whose selector **filters** the todos, crashes with an infinite update loop. Make the hook production-grade.

**`shallowEqual(a, b)`** (named export):

- `true` when `Object.is(a, b)`.
- `true` when both are arrays, or both are plain objects, with the same keys and `Object.is`-equal values at the first level.
- `false` otherwise (different lengths or keys, nested objects with different references, `null` vs object).

**`useStore(store, selector, isEqual = Object.is)`** (named export), built on `useSyncExternalStore`:

1. Cache the last `{ snapshot, selector, selection }`. When the snapshot and the selector are both unchanged, return the cached selection.
2. Otherwise run the selector; if `isEqual(previousSelection, next)` is true, keep returning the **previous** reference.
3. A selector that changes (because it depends on props) must produce the new result in the same render.
4. Pass a third argument, `getServerSnapshot`, that selects from `store.getInitialState()`, so `renderToString` works.

Observable results: a filtering selector with `shallowEqual` renders without looping, does not re-render when an unrelated field (`lastSyncedAt`) changes, and returns the same array reference while the items are equal.
