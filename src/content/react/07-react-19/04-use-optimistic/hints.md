`const [optimisticTodos, addOptimisticTodo] = useOptimistic(todos, (current, newTodo) => [...current, { ...newTodo, pending: true }]);`
---
Call `addOptimisticTodo({ id: 'optimistic', title })` as the first thing in the form action, before `await fetch(...)`. Form actions already run inside a Transition.
---
Map over `optimisticTodos` (not `todos`) and render `{todo.pending && <small>Saving...</small>}`. In the failure branch call `setError('Could not add todo.')` and return without touching `todos`.
