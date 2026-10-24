`TodoList` mutates its state, so nothing updates on screen and the parent's data gets corrupted. Rewrite the three handlers with **immutable updates**.

The component receives `initialTodos` (array of `{ id, title, completed }`) and stores it in state.

Rendered markup (already in the starter):

- A form with `<input name="title" aria-label="New todo" />` and a submit button `Add`.
- One `<li>` per todo with a checkbox labelled by the todo title and a `Delete` button labelled `Delete <title>`.

Requirements:

1. **Add**: submitting appends `{ id: nextId(todos), title, completed: false }` to the **end** of the list, using the trimmed input value. Ignore blank titles. Clear the form after adding.
2. **Toggle**: clicking a checkbox flips that todo's `completed`.
3. **Delete**: removes that todo.
4. Never mutate the `initialTodos` array or any todo object inside it.
