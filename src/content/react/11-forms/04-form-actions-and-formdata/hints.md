`formData.get('title')` returns a string or `null`: `const title = String(formData.get('title') ?? '').trim();`.
---
Send the request like any fetch: `await fetch('/api/todos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) })`, then `await response.json()` to get the created todo.
---
In the component, replace the placeholder with `useActionState(addTodoAction, initialState)` and pass the second item to `<form action={formAction}>`.
---
Use `defaultValue={state.title}` on the input, `disabled={isPending}` and `{isPending ? 'Saving...' : 'Add'}` on the button, and two conditional paragraphs for the messages.
