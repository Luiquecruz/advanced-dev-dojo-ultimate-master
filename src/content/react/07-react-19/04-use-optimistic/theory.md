## Show the result before the server confirms it

Chat apps show your message immediately, greyed out, and mark it as sent a moment later. That is **optimistic UI**: render the expected result now, reconcile with the real result when the server answers, and roll back if it fails.

```jsx
const [optimisticState, addOptimistic] = useOptimistic(state, updateFn);
```

- `state`: the real, confirmed value (usually from `useState`, props or a loader).
- `updateFn(currentState, optimisticValue)`: a pure function that returns the state to show while an Action is pending.
- `optimisticState`: equals `state` when nothing is pending; otherwise the result of applying every pending optimistic value.
- `addOptimistic(value)`: call it **inside an Action** to apply an optimistic update.

```jsx
function TodoList({ initialTodos }) {
  const [todos, setTodos] = useState(initialTodos);
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (current, newTodo) => [...current, { ...newTodo, pending: true }],
  );

  async function addTodo(formData) {
    const title = formData.get('title');
    addOptimisticTodo({ id: crypto.randomUUID(), title });
    const todo = await createTodo(title);
    startTransition(() => setTodos((current) => [...current, todo]));
  }

  return (
    <form action={addTodo}>
      <input name="title" />
      <ul>
        {optimisticTodos.map((todo) => (
          <li key={todo.id}>
            {todo.title} {todo.pending && <small>Saving...</small>}
          </li>
        ))}
      </ul>
    </form>
  );
}
```

## How rollback works

Optimistic values only live **while the Action is pending**. When the Action finishes, React throws the optimistic layer away and renders `optimisticState` from the real `state` again:

- **Success**: you updated `todos` inside the Action, so the real item replaces the optimistic one with no flicker.
- **Failure**: you did *not* update `todos`, so the optimistic item simply disappears. That is the rollback, and you wrote no code for it.

### The old way

```jsx
async function addTodo(title) {
  const tempId = Date.now();
  setTodos((current) => [...current, { id: tempId, title, pending: true }]);
  try {
    const todo = await createTodo(title);
    setTodos((current) => current.map((item) => (item.id === tempId ? todo : item)));
  } catch {
    setTodos((current) => current.filter((item) => item.id !== tempId));
  }
}
```

Temporary ids, manual replacement and manual rollback, all mixed into your real state. With `useOptimistic` the real state never contains fake data.

## Rules and pitfalls

- **Call `addOptimistic` inside an Action**: a form `action`, `useActionState`, or `startTransition`. Calling it in a plain event handler warns and the update is discarded immediately.
- **Keep `updateFn` pure.** It may run several times as the base state changes.
- **Update the real state in the same Action**, after the `await`, wrapped in `startTransition`. Otherwise the optimistic item disappears at the end of the Action and nothing replaces it.
- **Report failures.** Rollback is automatic but silent; set an error message so the user knows why the item vanished.
- Use it for actions that almost always succeed (likes, renames, adding messages). For destructive or risky operations, show a real pending state.
