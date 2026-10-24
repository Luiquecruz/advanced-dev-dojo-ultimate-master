import { useActionState } from 'react';

export async function addTodo(previousState, formData) {
  // TODO: read and trim the "title" field
  // TODO: return an error state when it is empty
  // TODO: POST /api/todos with { title } and append the created todo
  return previousState;
}

export default function AddTodoForm() {
  // TODO: const [state, formAction, isPending] = useActionState(...)
  const state = { todos: [], error: null };

  return (
    <form>
      {/* TODO: pass the form action to <form action={...}> */}
      <label>
        Title
        <input name="title" />
      </label>
      <button type="submit">Add todo</button>
      {/* TODO: render the error and the list of todos */}
    </form>
  );
}
