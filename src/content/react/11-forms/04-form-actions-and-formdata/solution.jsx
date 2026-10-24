import { useActionState } from 'react';

export const initialState = { status: 'idle', message: '', title: '' };

export async function addTodoAction(previousState, formData) {
  const title = String(formData.get('title') ?? '').trim();

  if (title.length < 3) {
    return { status: 'error', message: 'Title must be at least 3 characters', title };
  }

  const response = await fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    return { status: 'error', message: 'Could not save the todo', title };
  }

  const todo = await response.json();
  return { status: 'success', message: `Added "${todo.title}"`, title: '' };
}

export function AddTodoForm() {
  const [state, formAction, isPending] = useActionState(addTodoAction, initialState);

  return (
    <form action={formAction}>
      <label htmlFor="title">Title</label>
      <input id="title" name="title" defaultValue={state.title} />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Add'}
      </button>
      {state.status === 'error' && <p role="alert">{state.message}</p>}
      {state.status === 'success' && <p role="status">{state.message}</p>}
    </form>
  );
}

export default function App() {
  return <AddTodoForm />;
}
