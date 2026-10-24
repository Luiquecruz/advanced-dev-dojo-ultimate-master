`addTodo` is a reducer: it receives the previous state and returns the next one. Start with `const title = String(formData.get('title')).trim();` and return early when it is empty.
---
In the component, `const [state, formAction, isPending] = useActionState(addTodo, { todos: [], error: null });` then `<form action={formAction}>`.
---
Render `{state.error && <p role="alert">{state.error}</p>}` and `<ul>{state.todos.map((todo) => <li key={todo.id}>{todo.title}</li>)}</ul>`. Use `disabled={isPending}` on the button.
