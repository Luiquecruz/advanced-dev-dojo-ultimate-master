Build a todo form with `useActionState`.

1. Export an async function `addTodo(previousState, formData)`:
   - Read `formData.get('title')` and trim it.
   - If it is empty, return `{ ...previousState, error: 'Title is required.' }` **without** calling the API.
   - Otherwise `POST /api/todos` with the JSON body `{ "title": <title> }` (`Content-Type: application/json`), and return `{ todos: [...previousState.todos, createdTodo], error: null }` where `createdTodo` is the JSON response.
2. The default export `AddTodoForm`:
   - Calls `useActionState(addTodo, { todos: [], error: null })`.
   - Renders a `<form>` whose `action` is the returned form action.
   - Inside: a `<label>` with the text `Title` wrapping `<input name="title" />`, and a submit `<button>` with the text `Add todo` that is **disabled while pending**.
   - Renders `state.error` in a `<p role="alert">` when present.
   - Renders a `<ul>` with one `<li>` per todo in `state.todos` showing its `title`.
