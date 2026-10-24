## Functions are new on every render

Every render creates new function objects for everything declared in the component body:

```jsx
function TodoList() {
  const [todos, setTodos] = useState([]);
  const handleToggle = (id) => { /* ... */ };
  return todos.map((todo) => <TodoItem key={todo.id} todo={todo} onToggle={handleToggle} />);
}
```

Usually that is fine. It becomes a problem when the function is passed to:

- a child wrapped in **`memo`**: a new function reference is a changed prop, so the child re-renders anyway;
- a **dependency array** of `useEffect`, `useMemo` or another `useCallback`: the hook re-runs every render.

## Caching a function with `useCallback`

```jsx
import { useCallback } from 'react';

const handleToggle = useCallback((id) => {
  setTodos((current) => current.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)));
}, []);
```

React returns the **same function** on every render until one of the dependencies changes. `useCallback(fn, deps)` is exactly `useMemo(() => fn, deps)`: it does not make the function faster, it only preserves its identity.

## Shrinking dependencies

The callback must list every reactive value it reads. A naive version depends on `todos`:

```jsx
const handleToggle = useCallback((id) => {
  setTodos(todos.map(/* ... */));
}, [todos]);
```

That is correct, but `todos` changes after every toggle, so the callback changes too and **every** memoized item re-renders. Three techniques avoid that:

| Technique | Example |
| --- | --- |
| Functional state update | `setTodos((current) => ...)` reads the latest state, no `todos` dependency |
| Stable dispatch | `useReducer` returns a `dispatch` that never changes; pass it down directly |
| Pass the id up | the child calls `onToggle(todo.id)` instead of the parent creating `() => toggle(todo.id)` per item |

State setters and `dispatch` are guaranteed stable, so you can omit them from dependency arrays.

## Pitfalls

- **`useCallback` without `memo` does nothing useful.** If the child is not memoized, it re-renders regardless of the prop identity.
- **Inline arrows per item** (`onToggle={() => toggle(todo.id)}`) defeat the cache even when `toggle` is stable, because the arrow itself is new. Pass the stable function and let the child supply the id.
- **Missing dependencies** create stale closures: the function keeps seeing old props or state. Trust the `react-hooks/exhaustive-deps` lint rule.
- **Wrapping every handler** adds noise and work without benefit. Use it where identity matters.

## Event handlers that need fresh values

Sometimes an effect needs to call a function that reads the latest props without re-running when they change (for example, logging the current theme when a chat connects). React 19.2 added `useEffectEvent` for exactly that case. It is not a replacement for `useCallback` on props: Effect Events must only be called from inside effects.

## Modern note: React Compiler

With React Compiler (v1.0, stable since October 2025), functions and JSX are memoized automatically, so you seldom write `useCallback` by hand in new code. It is still everywhere in existing codebases, libraries and custom hooks that return functions (`useCallback` is the standard way for a custom hook to return a stable API).
