## Reading the status of the parent form

Design systems want a `<SubmitButton>` that disables itself and shows a spinner while its form submits. Before React 19 you had to thread an `isPending` prop from the form down to every button, or put it in Context yourself.

`useFormStatus` from **`react-dom`** reads the status of the **nearest parent `<form>`** whose `action` is a function:

```jsx
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending, data, method, action } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Saving...' : 'Save'}
    </button>
  );
}
```

| Field | While submitting | Otherwise |
| --- | --- | --- |
| `pending` | `true` | `false` |
| `data` | the `FormData` being submitted | `null` |
| `method` | `'get'` or `'post'` | `null` |
| `action` | the function passed to `action` | `null` |

Because `data` holds the submitted values, you can echo what is being sent: `data.get('email')`.

## The rule that trips everyone: it must be *inside* the form

`useFormStatus` behaves like a Context consumer provided by `<form>`. It only sees forms **rendered above the component that calls it**:

```jsx
function NewsletterForm() {
  // ❌ Always { pending: false }: this component renders the form,
  // it is not inside it.
  const { pending } = useFormStatus();
  return (
    <form action={subscribe}>
      <button disabled={pending}>Subscribe</button>
    </form>
  );
}
```

```jsx
function NewsletterForm() {
  // ✅ SubmitButton is rendered inside the form
  return (
    <form action={subscribe}>
      <input name="email" />
      <SubmitButton />
    </form>
  );
}
```

That is why the Hook pushes you towards small reusable children: a submit button, a field-level spinner, a "Sending to ..." hint.

## Form actions without `useActionState`

You don't always need state from the action. A plain function works:

```jsx
export default function NewsletterForm({ onSubscribe }) {
  const [done, setDone] = useState(false);

  async function subscribe(formData) {
    await onSubscribe(formData.get('email'));
    setDone(true);
  }

  if (done) return <p>Thanks!</p>;

  return (
    <form action={subscribe}>
      <input name="email" type="email" />
      <SubmitButton />
    </form>
  );
}
```

React runs `subscribe` in a Transition; every `useFormStatus` call inside this form reports `pending: true` until it resolves.

## useFormStatus vs useActionState

| | `useFormStatus` | `useActionState` |
| --- | --- | --- |
| Package | `react-dom` | `react` |
| Called in | a **child** of the form | the component that renders the form |
| Gives you | `pending`, `data`, `method`, `action` | the action result, a wrapped action, `isPending` |
| Typical use | reusable buttons and indicators | form-level result and errors |

They combine well: `useActionState` in the form for the result, `useFormStatus` in the button for the spinner.

## Pitfalls

- It only tracks forms whose `action` is a **function**. A form with `onSubmit` or a string URL `action` is never "pending".
- It does not track other forms on the page, only the closest ancestor.
- Import it from `react-dom`, not `react`.
