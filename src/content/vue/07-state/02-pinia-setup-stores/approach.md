1. Replace the placeholder `remaining` with a computed that counts incomplete todos.
2. Implement `fetchTodos` with `loading`/`error` bookkeeping and a `try / catch / finally` around `fetch('/api/todos')`, treating `!response.ok` as a failure.
3. Implement `toggle` by finding the todo by id and negating `completed`.
4. Declare a `$reset` function that restores the three refs and return it from the setup function.
5. In `App.vue`, call `store.fetchTodos()` in `onMounted` and bind `:checked` / `@change` on each checkbox.
