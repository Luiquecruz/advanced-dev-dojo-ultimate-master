`useCallback(fn, deps)` returns the **same function reference** until a dependency changes. `memo` then sees equal props and skips the item.
---
If you write `useCallback((id) => setTodos(todos.map(...)), [todos])`, the callback changes whenever `todos` changes, so toggling one item re-renders every item.
---
Read the latest state through the updater form instead: `useCallback((id) => { setTodos((current) => current.map(...)); }, [])`. State setters are always stable, so the dependency array stays empty.
