## A store is a hook

Zustand ("state" in German) is a tiny external store. `create` takes a function that receives `set` and `get` and returns the initial state **plus the actions** that change it. The result is a hook.

```jsx
import { create } from 'zustand';

export const useCounterStore = create((set, get) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  reset: () => set({ count: 0 }),
  logCount: () => console.log(get().count),
}));
```

No provider is needed: any component can import the hook.

```jsx
function Counter() {
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);
  return <button onClick={increment}>{count}</button>;
}
```

## How `set` works

- `set(partial)` **shallow-merges** the object into the current state, one level deep. You only return the keys that change.
- `set((state) => partial)` gives you the current state, like a functional `setState` update.
- `set(nextState, true)` replaces the whole state instead of merging. Rarely needed.
- Nested objects and arrays must still be updated immutably:

```jsx
addTodo: (title) =>
  set((state) => ({ todos: [...state.todos, { id: Date.now(), title }] })),
```

## Selectors control re-renders

The function passed to the hook is a **selector**. The component re-renders only when the selected value changes (compared with `Object.is`).

```jsx
const count = useCounterStore((state) => state.count);
const everything = useCounterStore();
```

The first line re-renders only when `count` changes. The second subscribes to the whole store and re-renders on every update: avoid it in real components.

Selectors can derive values, and you can export them for reuse and testing:

```jsx
export const selectDoneCount = (state) => state.todos.filter((todo) => todo.done).length;
const doneCount = useTodoStore(selectDoneCount);
```

### Pitfall: selectors that build new objects

```jsx
const { count, increment } = useCounterStore((state) => ({ count: state.count, increment: state.increment }));
```

This selector returns a **new object on every call**, so `Object.is` never sees it as equal. In Zustand 5 this triggers an infinite update loop error. Either select values one by one, or wrap the selector with `useShallow`, which compares the result field by field:

```jsx
import { useShallow } from 'zustand/react/shallow';

const { count, increment } = useCounterStore(
  useShallow((state) => ({ count: state.count, increment: state.increment })),
);
```

## Using the store outside React

The hook is also the store API:

```js
useCounterStore.getState().increment();
useCounterStore.setState({ count: 10 });
const unsubscribe = useCounterStore.subscribe((state, previous) => console.log(state.count));
```

This is useful in WebSocket handlers, router loaders and **tests**: you can call actions and assert on `getState()` without rendering.

## Middleware

`zustand/middleware` wraps the initializer to add behavior:

```jsx
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

export const useSettingsStore = create(
  devtools(
    persist(
      (set) => ({ theme: 'dark', toggle: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })) }),
      { name: 'settings' },
    ),
  ),
);
```

`persist` saves to `localStorage`, `devtools` connects to the Redux DevTools extension, and `immer` lets you write mutating updates.

## Zustand 4 vs 5

- The default export is gone: use `import { create } from 'zustand'`.
- Selectors returning new references now throw instead of silently re-rendering: use `useShallow`.
- The custom equality function argument moved to `createWithEqualityFn` in `zustand/traditional`.
- React 18+ is required; the store is built on `useSyncExternalStore`.

## When to choose Zustand

Zustand fits global client state with little ceremony: a cart, UI preferences, an editor's selection. It has no opinions about structure, so for large teams with strict conventions Redux Toolkit may be a better fit, and for server data a query library is still the right tool.
