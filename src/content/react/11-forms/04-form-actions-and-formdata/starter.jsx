import { useActionState } from 'react';

export const initialState = { status: 'idle', message: '', title: '' };

export async function addTodoAction(previousState, formData) {
  // TODO: read and trim the "title" field from formData
  // TODO: when it is shorter than 3 characters return { status: 'error', message: 'Title must be at least 3 characters', title }
  // TODO: POST { title } as JSON to /api/todos
  // TODO: return { status: 'success', message: `Added "${todo.title}"`, title: '' }
  return previousState;
}

export function AddTodoForm() {
  // TODO: const [state, formAction, isPending] = useActionState(addTodoAction, initialState);
  const state = initialState;

  return (
    // TODO: pass formAction to the form's action prop
    <form>
      <label htmlFor="title">Title</label>
      {/* TODO: keep the submitted value after an error with defaultValue={state.title} */}
      <input id="title" name="title" />
      {/* TODO: disable the button and show "Saving..." while isPending */}
      <button type="submit">Add</button>
      {/* TODO: render the error message in <p role="alert"> and the success message in <p role="status"> */}
    </form>
  );
}

export default function App() {
  return <AddTodoForm />;
}
