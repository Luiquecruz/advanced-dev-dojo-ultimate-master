## Thinking in atoms

A Zustand or Redux store is **top-down**: one object, and components select slices of it. Jotai is **bottom-up**: you declare tiny independent atoms and compose them into a dependency graph. Each component subscribes only to the atoms it reads, so re-render granularity comes for free, without selectors or memoized equality functions.

An atom is only a **config object** (a key into a store). Its value lives in a store: the implicit default store, or one created by `<Provider>` / `createStore()`.

```js
import { atom } from 'jotai';

export const tasksAtom = atom([]);
export const filterAtom = atom('all');

export const visibleTasksAtom = atom((get) => {
  const filter = get(filterAtom);
  const tasks = get(tasksAtom);
  if (filter === 'all') return tasks;
  return tasks.filter((task) => (filter === 'done' ? task.done : !task.done));
});
```

`visibleTasksAtom` is **derived state**: never stored, recomputed only when `tasksAtom` or `filterAtom` change, and cached per store.

## Actions as write-only atoms

Business logic belongs in atoms, not in components. A write-only atom (`atom(null, write)`) is the Jotai equivalent of a store action and can touch several atoms at once:

```js
export const toggleTaskAtom = atom(null, (get, set, id) => {
  set(tasksAtom, get(tasksAtom).map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
});
```

Components that only trigger it use `useSetAtom(toggleTaskAtom)`, which does not subscribe to any value.

## Persistence with `atomWithStorage`

```js
import { atomWithStorage, RESET } from 'jotai/utils';

export const filterAtom = atomWithStorage('task-filter', 'all');
```

- Writes are serialized with `JSON.stringify` into `localStorage` under the key.
- By default the stored value is read **when the atom is mounted** (the first render shows the initial value). Pass `{ getOnInit: true }` as the fourth argument to read it synchronously on first use, at the cost of SSR hydration mismatches.
- `set(filterAtom, RESET)` removes the key and returns to the initial value.
- `createJSONStorage(() => sessionStorage)` swaps the backend.

## Scoping: Provider, createStore and hydration

Without a provider, every component in the app shares the **default store**. That is fine for app-wide state, but wrong for reusable widgets: two `<TaskBoard>`s would share tasks. Wrap each instance in `<Provider>` to give it a private store, and seed it with `useHydrateAtoms` from a component **inside** that provider:

```jsx
import { Provider } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';

function HydrateTasks({ tasks, children }) {
  useHydrateAtoms([[tasksAtom, tasks]]);
  return children;
}

export function TaskBoard({ initialTasks }) {
  return (
    <Provider>
      <HydrateTasks tasks={initialTasks}>
        <Board />
      </HydrateTasks>
    </Provider>
  );
}
```

`useHydrateAtoms` writes each value **once per store**, which is also the pattern for injecting server-rendered data. Outside React, `createStore()` gives you `get`, `set` and `sub`: ideal for unit tests of atom logic.

```js
const store = createStore();
store.set(tasksAtom, [{ id: 1, title: 'Write tests', done: false }]);
store.set(toggleTaskAtom, 1);
store.get(visibleTasksAtom);
```

## Granularity tools

- `selectAtom(baseAtom, selector, equalityFn?)` derives a slice and skips updates when the slice is equal.
- `splitAtom(arrayAtom)` turns an array atom into an atom of item atoms, so editing one row re-renders only that row.
- `unwrap(asyncAtom, fallback)` turns an async atom into a sync one that returns the fallback while pending, avoiding Suspense.
- `atomWithReset`, `atomWithReducer`, `atomWithDefault` and `atomWithRefresh` cover common shapes.

## Jotai 3 notes

Jotai 3 is ESM only and removed long-deprecated APIs: `atomFamily` now lives in the separate `jotai-family` package, `loadable` was dropped (use `unwrap`), and the `setSelf` argument of read functions is gone. Core concepts and hooks are unchanged from v2.

## Pitfalls

- Defining atoms inside components creates a new atom on each render. Keep them at module level or memoize them.
- Async read atoms suspend. Without a `<Suspense>` boundary nearby, the whole tree above suspends.
- Huge "god atoms" holding an object defeat the model: every reader re-renders on any field change. Split them or use `selectAtom`.
- Writing derived values into another atom by hand recreates the sync problem atoms solve. Derive instead.

## When to use it / when not to

**Use Jotai** when state is a graph of many small, interdependent values: editors, canvas tools, form builders, dashboards with linked filters, or reusable widgets that need per-instance scope. It replaces "one context per value" with fine-grained subscriptions and keeps derived state declarative.

**Avoid it** when the team wants one inspectable store with time-travel devtools and strict conventions (Redux Toolkit), when the state is a few global flags (Zustand or Context are simpler), or for server data: use TanStack Query or RTK Query, and only bridge with `jotai-tanstack-query` if you already live in atoms.
