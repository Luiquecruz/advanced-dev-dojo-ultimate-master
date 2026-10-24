## State that comes from an Action

Most forms follow the same loop: submit, wait, then show a result (a new item, a validation error, a success message). `useActionState` packages that loop into one Hook:

```jsx
const [state, formAction, isPending] = useActionState(action, initialState);
```

| Value | Meaning |
| --- | --- |
| `state` | `initialState` on the first render, then whatever the last `action` call returned |
| `formAction` | a wrapped Action you pass to `<form action>` or `<button formAction>` |
| `isPending` | `true` while the Action runs |

Your `action` receives the **previous state** first and the submitted payload second. For forms, that payload is a `FormData` object:

```jsx
async function addTodo(previousState, formData) {
  const title = formData.get('title').trim();
  if (!title) {
    return { ...previousState, error: 'Title is required.' };
  }
  const todo = await createTodo(title);
  return { todos: [...previousState.todos, todo], error: null };
}
```

Because the action is a reducer of "previous state + input => next state", it is easy to test without rendering anything.

## Wiring it to a form

```jsx
import { useActionState } from 'react';

export default function AddTodoForm() {
  const [state, formAction, isPending] = useActionState(addTodo, { todos: [], error: null });

  return (
    <form action={formAction}>
      <input name="title" />
      <button disabled={isPending}>Add</button>
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  );
}
```

In React 19, `<form action={fn}>` accepts a function. React prevents the default browser submission, builds a `FormData` from the form's fields (using each input's `name`), and calls your function inside a Transition. After a successful submission React **resets uncontrolled fields** automatically.

### The old way

```jsx
function AddTodoForm() {
  const [todos, setTodos] = useState([]);
  const [error, setError] = useState(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const title = new FormData(event.currentTarget).get('title');
    setIsPending(true);
    // validation, try/catch, finally, manual reset...
  }

  return <form onSubmit={handleSubmit}>{/* ... */}</form>;
}
```

`useActionState` removes the `preventDefault`, the pending flag and the reset logic, and it **queues** submissions: if the user submits twice, the second call receives the state returned by the first, so results never arrive out of order.

## Pitfalls

- **Inputs need a `name`.** `formData.get('title')` reads by `name`, not by `id` or label.
- **Return the whole state.** Whatever you return replaces `state`. Forgetting to spread `previousState` loses data.
- **Calling `formAction` manually.** Outside a form, call it inside `startTransition(() => formAction(payload))`, otherwise React warns that `isPending` cannot be tracked.
- **Errors thrown** inside the action go to the nearest Error Boundary and cancel queued calls. Return expected errors as state instead.

## Naming history

During the React 19 canary period this Hook was called `useFormState` and lived in `react-dom`. It was renamed and moved to `react` because it works with any Action, not only forms. `useFormState` is deprecated.

In frameworks with Server Components, a third argument `permalink` enables progressive enhancement: the form works even before JavaScript loads.
