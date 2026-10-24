## State that lives outside React

Most state lives in components (`useState`, `useReducer`). Some does not: a global store module, `navigator.onLine`, `window.matchMedia`, `localStorage` changes from other tabs, a WebSocket client, the URL. React needs to **read** that state during render and **re-render** when it changes.

The naive approach syncs it into component state with an Effect:

```jsx
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return isOnline;
}
```

It mostly works, but it renders once with a possibly stale value, duplicates the state, and with concurrent rendering different components can read **different** versions of the store in the same render, a glitch called **tearing**.

## `useSyncExternalStore`

```jsx
const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?);
```

| Argument | Contract |
| --- | --- |
| `subscribe(onStoreChange)` | start listening, call `onStoreChange` on every change, **return an unsubscribe function** |
| `getSnapshot()` | return the current value; must return the **same value** (`Object.is`) while the store has not changed |
| `getServerSnapshot()` | value used during server rendering and hydration |

```jsx
function subscribe(callback) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function useOnlineStatus() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}
```

React subscribes on mount, unsubscribes on unmount, re-renders when the snapshot changes and guarantees every component sees a consistent snapshot in one render.

## A minimal store

Global state libraries are built on this Hook. The core is tiny:

```jsx
function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();
  return {
    getState: () => state,
    setState(next) {
      state = typeof next === 'function' ? next(state) : next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function useStore(store, selector) {
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}
```

With a **selector**, a component re-renders only when **its slice** changes: React compares the new snapshot with the previous one using `Object.is`. Updates are immutable (`{ ...state, items: 1 }`), so unchanged slices keep their identity.

## Pitfalls

**Unstable snapshots.** `getSnapshot` returning a new object each call makes React think the store always changed. React detects this and throws *"The result of getSnapshot should be cached"* (or loops forever):

```jsx
useSyncExternalStore(store.subscribe, () => ({ items: store.getState().items }));
```

Return primitives or existing references, or memoize derived objects (Zustand's `useShallow`, Redux's `createSelector`).

**Inline `subscribe`.** Defining `subscribe` inside the component creates a new function every render, so React resubscribes each time. Define it outside the component or memoize it.

**Mutable stores.** If you mutate the state object in place, the snapshot reference never changes and components do not update.

## Updates are synchronous

Store changes rendered through this Hook cannot be marked as transitions: if a store update suspends, React shows the nearest fallback. Prefer React state for UI that should use `startTransition`.

## Ecosystem

Zustand, Redux (`react-redux` v8+), Jotai, Valtio, TanStack Query and React Router all use `useSyncExternalStore` internally. For React 16/17 there was a shim package, `use-sync-external-store`, still found in older dependencies.

## Legacy vs modern

Before React 18, libraries subscribed in `componentDidMount` / `useEffect` and forced updates with `setState` or `forceUpdate`. Concurrent rendering made that approach prone to tearing, so React 18 shipped this Hook as the official integration point for external stores.
