## Atoms: state built bottom-up

Redux and Zustand start from one big store and select slices out of it (**top-down**). Jotai starts from tiny independent pieces of state called **atoms** and composes them (**bottom-up**). An atom is just a config object; the value lives in a store.

```jsx
import { atom, useAtom } from 'jotai';

const countAtom = atom(0);

function Counter() {
  const [count, setCount] = useAtom(countAtom);
  return <button onClick={() => setCount((value) => value + 1)}>{count}</button>;
}
```

`useAtom` feels exactly like `useState`, but every component that uses `countAtom` shares the same value. Components re-render only when an atom they read changes, so there is no selector boilerplate.

## Three kinds of atoms

**Primitive atom**: holds a value.

```js
const celsiusAtom = atom(20);
```

**Derived read-only atom**: computes from other atoms with `get`. It updates automatically when its dependencies change, like a spreadsheet formula.

```js
const fahrenheitAtom = atom((get) => (get(celsiusAtom) * 9) / 5 + 32);
```

**Writable derived atom**: add a write function `(get, set, ...args)`. It can update any other atoms.

```js
const fahrenheitAtom = atom(
  (get) => (get(celsiusAtom) * 9) / 5 + 32,
  (get, set, fahrenheit) => set(celsiusAtom, ((fahrenheit - 32) * 5) / 9),
);
```

**Write-only "action" atom**: pass `null` as the read value. Useful for actions touching several atoms.

```js
const resetAtom = atom(null, (get, set) => {
  set(celsiusAtom, 20);
});
```

## Hooks

| Hook | Returns | Use when |
| --- | --- | --- |
| `useAtom(atom)` | `[value, set]` | read and write |
| `useAtomValue(atom)` | `value` | read only |
| `useSetAtom(atom)` | `set` | write only: the component does **not** re-render when the value changes |

```jsx
function ResetButton() {
  const reset = useSetAtom(resetAtom);
  return <button onClick={reset}>Reset</button>;
}
```

## Stores and Provider

Without a provider, atoms live in a global default store. Wrap a subtree in `<Provider>` to give it its own isolated store: two `<Provider>`s using the same atoms have independent values. This is useful for reusable widgets, tests and server rendering.

```jsx
import { Provider, createStore } from 'jotai';

const store = createStore();
store.set(celsiusAtom, 100);
store.get(fahrenheitAtom);

<Provider store={store}>
  <App />
</Provider>;
```

`createStore()` exposes `get`, `set` and `sub` (subscribe), so you can read and write atoms outside React, for example in tests.

## Async atoms

A read function can return a Promise. Components reading it **suspend** until it resolves, so wrap them in `<Suspense>`:

```jsx
const userIdAtom = atom(1);
const userAtom = atom(async (get, { signal }) => {
  const response = await fetch(`/api/users/${get(userIdAtom)}`, { signal });
  return response.json();
});
```

Changing `userIdAtom` refetches automatically, and the `signal` aborts the previous request. For serious server state (caching, refetching, mutations) you still want a query library; the `jotai-tanstack-query` integration bridges both.

## Pitfalls

- **Creating atoms inside a component** (`const a = atom(0)` in the body) makes a new atom on every render, so the state resets. Define atoms at module level, or memoize them with `useMemo` when they must be dynamic.
- **Atoms are compared by reference**, not by name. Two calls to `atom(0)` are two different pieces of state.
- **Overusing `useAtom`** where only the setter is needed causes extra renders: prefer `useSetAtom`.

## Jotai vs Recoil

Recoil, Meta's experimental atomic state library, popularized atoms with **string keys** (`atom({ key: 'count', default: 0 })`) and selectors. It never reached 1.0 and its repository was archived in 2025. Jotai offers the same mental model without keys, with a smaller API, and is the usual migration target. Utilities such as `atomWithStorage`, `atomFamily` and `selectAtom` live in `jotai/utils`.

## When to choose Jotai

Jotai fits apps with many small, interdependent pieces of state: editors, form builders, dashboards with linked filters. It replaces "a context per value" patterns with atoms that only re-render their real consumers.
