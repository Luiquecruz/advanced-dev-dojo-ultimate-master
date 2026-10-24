1. In `handleAdd`, replace `push` + `setTodos(todos)` with `setTodos([...todos, { id: nextId(todos), title, completed: false }])`.
2. In `handleToggle`, map over the todos and return `{ ...todo, completed: !todo.completed }` for the matching id, the original object for the rest.
3. In `handleDelete`, use `filter` to keep every todo whose id differs.
4. Check that nothing writes to `todos` or its objects directly; the original `initialTodos` must stay untouched.
