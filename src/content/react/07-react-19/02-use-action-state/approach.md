1. Write `addTodo` as a pure state transition: read and trim the field, return an error state for empty input.
2. For valid input, `await fetch('/api/todos', { method: 'POST', ... })`, parse the created todo and return a new state that appends it and clears the error.
3. Call `useActionState(addTodo, { todos: [], error: null })` in the component.
4. Pass the returned form action to `<form action>`; React builds the `FormData` from the `name` attributes.
5. Render the error, the list and `disabled={isPending}` on the submit button.
