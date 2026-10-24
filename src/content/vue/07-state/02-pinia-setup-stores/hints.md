In a setup store, refs become state, `computed` becomes getters and plain functions become actions, but only if you **return** them.
---
`remaining` is `computed(() => todos.value.filter((todo) => !todo.completed).length)`. Inside the store, refs need `.value`.
---
Wrap the request in `try / catch / finally`: check `response.ok` and throw when it is false, set `error` in `catch`, and reset `loading` in `finally`.
---
`$reset` is just a function named `$reset` that assigns the initial values. Add it to the returned object: `return { todos, loading, error, remaining, fetchTodos, toggle, $reset }`.
