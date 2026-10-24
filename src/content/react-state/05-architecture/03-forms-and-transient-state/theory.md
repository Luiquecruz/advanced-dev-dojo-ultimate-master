## Form state is transient

A form holds several kinds of state at once:

| Piece | Lifetime | Typical home |
| --- | --- | --- |
| Field values (the draft) | until submit or cancel | the DOM (uncontrolled) or the form library |
| Touched / dirty flags | while the form is mounted | the form library |
| Validation errors | until the value changes | derived from a schema |
| Submission status | one request | Action (`useActionState`) or mutation state |
| Saved data | permanent | the **server** (query cache) |

The draft is **transient**: it exists to be submitted or thrown away. Putting it in a global store makes every keystroke a global update, leaks drafts between screens and duplicates data that already lives in the query cache. The default home of form state is **the form itself**.

## Controlled vs uncontrolled

- **Controlled** (`value` + `onChange` + `useState`): React owns the value and re-renders on every keystroke. Fine for small forms or fields that drive other UI live (a search box, a character counter).
- **Uncontrolled** (`defaultValue`, read with `FormData` on submit): the DOM owns the value and nothing re-renders while typing. Best for performance and the natural fit for React 19 Actions.

## React 19 Actions

```jsx
import { useActionState } from 'react';

async function saveProfile(previousState, formData) {
  const name = formData.get('name');
  if (!name) return { error: 'Name is required' };
  await updateProfile({ name });
  return { error: null };
}

function ProfileForm() {
  const [state, formAction, isPending] = useActionState(saveProfile, { error: null });
  return (
    <form action={formAction}>
      <input name="name" defaultValue="Ada" />
      <button disabled={isPending}>Save</button>
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  );
}
```

`useActionState` keeps the **result** of the last submission (errors, messages) and an `isPending` flag; `useFormStatus` exposes the pending state to nested buttons; uncontrolled fields are **reset automatically** when the Action succeeds (`requestFormReset` from `react-dom` resets manually). With Server Functions the same form works before hydration (progressive enhancement).

## React Hook Form for large forms

```jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({ email: z.email(), seats: z.coerce.number().min(1) });

function InviteForm({ onInvite }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', seats: 1 },
  });
  return (
    <form onSubmit={handleSubmit(onInvite)}>
      <input {...register('email')} aria-invalid={Boolean(errors.email)} />
      {errors.email && <p role="alert">{errors.email.message}</p>}
      <input type="number" {...register('seats')} />
      <button disabled={isSubmitting}>Invite</button>
    </form>
  );
}
```

- `register` keeps fields **uncontrolled**; `formState` is a proxy, so a component re-renders only for the flags it reads.
- `useWatch({ control, name })` subscribes to one field for live UI (a price preview) without re-rendering the whole form; `Controller` wraps controlled third-party inputs.
- One **zod** schema validates on the client and can be shared with the server.
- `defaultValues` seeds the form once; the `values` option (or `reset(data)`) syncs it when server data arrives later.
- Server-side errors map back to fields with `setError('email', { message })`.

## Where drafts sometimes go further

- **Survive navigation or reload** (long posts, support tickets): persist the draft explicitly, keyed by entity id, in `sessionStorage`/`localStorage` or a small persisted store, and clear it on submit.
- **Multi-step wizards**: one owner for the whole wizard (a parent component, a scoped store, or an XState machine when steps branch and validate asynchronously). Not one global store field per step.
- **Edit forms** start from server data: read it from the query cache, edit a local copy, then mutate and invalidate. The cache is never edited directly while typing.

## When to use it / when not to

**Use local or uncontrolled state and Actions** for small and medium forms, **React Hook Form + zod** for large, dynamic or heavily validated forms, and **explicit persistence** only for drafts users would hate to lose.

**Do not** mirror form fields into Redux/Zustand "so other components can see them", do not copy server data into form state with effects (seed with `defaultValues`/`values` instead), and do not make every field controlled by default in big forms.
