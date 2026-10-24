## Forms already know their values

Browsers have handled forms since the 90s: every named input inside a `<form>` is collected on submit. The **`FormData`** API exposes those values to JavaScript without any React state.

```js
const formData = new FormData(formElement);
formData.get('title');
formData.getAll('tags');
Object.fromEntries(formData);
```

Inputs only need a `name`. They stay **uncontrolled**: use `defaultValue` (or `defaultChecked`) for the initial value instead of `value` + `onChange`.

## The legacy way: `onSubmit` + `preventDefault`

```jsx
function AddTodo() {
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    await createTodo(title);
    setIsSaving(false);
    setTitle('');
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={title} onChange={(event) => setTitle(event.target.value)} />
      <button disabled={isSaving}>Add</button>
    </form>
  );
}
```

It works, but you manage pending state, errors, resetting and race conditions by hand.

## React 19: functions as form actions

In React 19 the `action` prop of `<form>` (and `formAction` on buttons) accepts a **function**. React prevents the full-page submit, builds the `FormData` and calls your function with it:

```jsx
async function save(formData) {
  await createTodo(formData.get('title'));
}

<form action={save}>
  <input name="title" />
  <button type="submit">Add</button>
</form>;
```

The action runs inside a **transition**, so the UI stays responsive, and after it completes React **resets the form** (uncontrolled inputs go back to their `defaultValue`).

## `useActionState`: results and pending state

Most actions need to report back: validation errors, a success message, the saved entity. `useActionState` wraps an action and keeps its last result as state:

```jsx
const [state, formAction, isPending] = useActionState(action, initialState);
```

- The action's signature becomes **`(previousState, formData) => nextState`** (sync or async).
- `state` is whatever the action returned last (`initialState` before the first submit).
- `isPending` is `true` while the action runs.
- Pass `formAction` to `<form action={formAction}>`.

```jsx
async function subscribe(previousState, formData) {
  const email = String(formData.get('email') ?? '').trim();
  if (!email.includes('@')) {
    return { error: 'Enter a valid email', email };
  }
  await api.subscribe(email);
  return { error: null, email: '' };
}

function Newsletter() {
  const [state, formAction, isPending] = useActionState(subscribe, { error: null, email: '' });
  return (
    <form action={formAction}>
      <input name="email" defaultValue={state.email} />
      <button disabled={isPending}>{isPending ? 'Sending...' : 'Subscribe'}</button>
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  );
}
```

### Keeping input after an error

Because React resets the form after **every** action, an invalid submission would wipe what the user typed. The fix is to return the submitted values in the state and use them as `defaultValue`: the reset then restores them. On success, return empty values.

### Validation inside the action

Actions are the natural place for validation, and a Zod schema works well there: `schema.safeParse(Object.fromEntries(formData))`, then return `z.flattenError(result.error).fieldErrors` as state.

## Related hooks

- **`useFormStatus()`** (from `react-dom`): read `{ pending, data, method, action }` of the parent form from a child component, such as a reusable submit button.
- **`useOptimistic`**: show the expected result immediately while the action runs.

## Server Functions and progressive enhancement

In frameworks with React Server Components, an action can be a **Server Function** marked with `'use server'`. The form then works **before JavaScript loads**: the browser posts it natively and the server runs the function. `useActionState` accepts a `permalink` argument for this case. In a client-only app, actions are ordinary async functions calling your API.

## When to use which

| Need | Tool |
| --- | --- |
| Simple forms, server functions, progressive enhancement | form actions + `useActionState` |
| Complex client validation, dynamic fields, field-level UX | React Hook Form + Zod |
| Live formatting or dependent fields on every keystroke | controlled inputs |

## Pitfalls

- `formData.get` returns `string | File | null`, never a number: convert and validate.
- Inputs without a `name` are not included in `FormData`.
- Mixing `value` without `onChange` on an input makes it read-only; use `defaultValue`.
- With `useActionState`, the first parameter is the **previous state**, not the form data.
- Actions are queued: several quick submits run one after another, each receiving the previous result.
