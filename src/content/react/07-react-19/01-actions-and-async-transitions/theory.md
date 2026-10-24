## What is an Action?

In React 19, an **Action** is any function that runs inside a Transition, including **async** functions. React tracks the whole async function: the Transition stays pending from the first line until the returned Promise settles.

Before React 19, `startTransition` only accepted synchronous callbacks, so every component that talked to a server re-implemented the same boilerplate.

### The old way: manual pending and error state

```jsx
function RenameTodo() {
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      await saveTitle(title);
    } catch {
      setError('Could not save.');
    } finally {
      setIsSaving(false);
    }
  }
  // ...
}
```

Three pieces of state, a `try/finally` you must never forget, and nothing stops a double click from firing two overlapping requests that finish out of order.

### The new way: async transitions

```jsx
import { useState, useTransition } from 'react';

function RenameTodo() {
  const [title, setTitle] = useState('');
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await saveTitle(title);
      startTransition(() => {
        setError(result.error ?? null);
      });
    });
  }

  return (
    <button onClick={handleSave} disabled={isPending}>
      {isPending ? 'Saving...' : 'Save'}
    </button>
  );
}
```

- `isPending` flips to `true` **synchronously** when the Action starts and back to `false` when the async function finishes. No `finally` needed.
- While the Action runs, the UI stays interactive: typing in inputs is never blocked.
- Several Actions started back to back are **batched**: `isPending` stays `true` until all of them finish, and their final state updates are committed together.

## Pitfall: updates after `await`

React can only know a `setState` call belongs to a Transition while the synchronous part of `startTransition` is running. After an `await`, that context is lost (JavaScript has no async context yet). Updates there become regular urgent updates. To keep them inside the Transition, wrap them in another `startTransition`:

```jsx
startTransition(async () => {
  const todo = await updateTodo(id, title);
  startTransition(() => {
    setTodo(todo);
  });
});
```

It works without the wrapper, but the update may render before other pending Transitions and may show intermediate states.

## Handling errors

An error thrown inside an Action and not caught propagates to the nearest **Error Boundary**, like a render error. For expected failures (validation, HTTP 4xx/5xx) catch them and store a message in state instead:

```jsx
startTransition(async () => {
  const response = await fetch('/api/todos/2', { method: 'PATCH', body });
  if (!response.ok) {
    startTransition(() => setError('Could not save.'));
    return;
  }
});
```

Remember that `fetch` only rejects on network errors. A `500` response resolves normally, so check `response.ok`.

## `startTransition` without the hook

`import { startTransition } from 'react'` works outside components (routers, stores) but gives you no `isPending`. Inside components prefer `useTransition`.

## The building block for everything else

Actions are the foundation of the rest of React 19:

| API | Built on Actions |
| --- | --- |
| `useActionState` | returns state + an Action + `isPending` |
| `<form action={fn}>` | submits the form as an Action |
| `useFormStatus` | reads the pending state of the parent form Action |
| `useOptimistic` | shows temporary state while an Action runs |

By convention, props that accept Actions are named `action` or end with `Action` (`submitAction`, `deleteAction`), which tells callers the function will run inside a Transition.
