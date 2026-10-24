1. List the props of `TodoItem`: `todo`, `onToggle`, `onDelete`, `onRender`. Only the two handlers change on every render.
2. Wrap each handler in `useCallback` so React returns the cached function between renders.
3. Remove the dependency on `todos` by switching to the functional updater `setTodos((current) => ...)`.
4. With empty dependency arrays, the handlers never change, so typing in the draft input leaves every item untouched.
5. Toggling an item creates a new object only for that todo, so only that `TodoItem` receives a changed `todo` prop and re-renders.
