## The primitive under every store

Zustand, Redux (`react-redux`), Jotai, Valtio and TanStack Query all connect to React through one hook: `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?)`. Building a small store with it is the best way to understand what those libraries do for you, and when you do not need them.

- `subscribe(onChange)` registers a callback and returns an unsubscribe function. It must be **stable**: a new function each render makes React resubscribe every render.
- `getSnapshot()` returns the current value. React calls it during render and after every notification, and re-renders only if the result changed by `Object.is`.
- `getServerSnapshot()` returns the value used during server rendering and hydration.

## Why not `useState` + `useEffect`?

Subscribing in an Effect and copying into state works in simple cases, but with concurrent rendering React may pause a render halfway. If the store changes in between, some components render the old value and others the new one: **tearing**. `useSyncExternalStore` detects that the snapshot changed during render and re-renders synchronously, so one commit never shows two versions of the store.

## The snapshot must be cached

React calls `getSnapshot` many times and compares results. If it returns a **new object every call**, React sees a change every time and loops:

```jsx
useSyncExternalStore(store.subscribe, () => store.getState().todos.filter((todo) => !todo.done));
```

In development React warns that "the result of getSnapshot should be cached", then fails with "Maximum update depth exceeded". Selectors returning primitives or existing references (`state.todos`) are safe; selectors that **derive** arrays or objects are not.

## Memoizing selections

The fix is to remember the last input and output, and to accept a custom equality function:

```jsx
export function useStore(store, selector, isEqual = Object.is) {
  const cache = useRef(null);

  const select = (snapshot) => {
    const current = cache.current;
    if (current && current.snapshot === snapshot && current.selector === selector) {
      return current.selection;
    }
    const next = selector(snapshot);
    const selection = current && isEqual(current.selection, next) ? current.selection : next;
    cache.current = { snapshot, selector, selection };
    return selection;
  };

  return useSyncExternalStore(store.subscribe, () => select(store.getState()), () => select(store.getInitialState()));
}
```

Three layers of protection:

1. **Same snapshot and same selector** → return the cached selection without running the selector (cheap repeated calls).
2. **New result, but equal** according to `isEqual` (for example `shallowEqual` over the array items) → return the **previous** reference, so React sees no change and skips the render.
3. **Different selector** (it depends on a prop that changed) → recompute immediately.

Because inline selectors are new functions on every render, checking only the snapshot would return stale data after a prop change; checking only the selector would recompute constantly. Keying on both is what makes inline selectors safe.

This is the same idea as `useSyncExternalStoreWithSelector` from the `use-sync-external-store/with-selector` package, which `react-redux` and Zustand's `useStoreWithEqualityFn` build on, and what `useShallow` does in Zustand 5.

## Shallow equality

`shallowEqual(a, b)` returns `true` when both values are `Object.is` equal, or when both are arrays/objects with the same keys whose values are `Object.is` equal. It does not recurse: nested objects are compared by reference, which works because immutable updates keep unchanged items' references.

## Server rendering

Without `getServerSnapshot`, server rendering throws. It must return the value the server rendered with, usually the **initial** state, so hydration matches. Client-only changes (from `localStorage`, for example) are then applied after hydration.

## When to use it / when not to

Write your own `useSyncExternalStore` integration to subscribe to browser APIs (`matchMedia`, `navigator.onLine`, `localStorage` events), to wrap a non-React library (a WebSocket client, a map SDK), or to build a tiny shared store in a library with no dependencies. For application state, prefer a battle-tested store (Zustand, Redux Toolkit, Jotai): they already handle selector memoization, equality, devtools, middleware and edge cases. Do not use it for state owned by one component (`useState`) or for server data (a query cache).
