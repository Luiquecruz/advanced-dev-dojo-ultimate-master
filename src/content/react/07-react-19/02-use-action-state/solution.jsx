import { useActionState } from 'react';

export async function addTodo(previousState, formData) {
  const title = String(formData.get('title')).trim();
  if (!title) {
    return { ...previousState, error: 'Title is required.' };
  }
  const response = await fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  const todo = await response.json();
  return { todos: [...previousState.todos, todo], error: null };
}

export default function AddTodoForm() {
  const [state, formAction, isPending] = useActionState(addTodo, { todos: [], error: null });

  return (
    <form action={formAction}>
      <label>
        Title
        <input name="title" />
      </label>
      <button type="submit" disabled={isPending}>
        Add todo
      </button>
      {state.error && <p role="alert">{state.error}</p>}
      <ul>
        {state.todos.map((todo) => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
    </form>
  );
}
