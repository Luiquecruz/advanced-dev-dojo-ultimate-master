## Why a form library

Hand-written forms repeat the same work: values, touched flags, error messages, submit state, server errors, resetting. React Hook Form (RHF) packages all of it with a twist: inputs stay **uncontrolled**. Values live in the DOM and RHF reads them through refs, so typing does not re-render the whole form.

## `useForm` and `register`

```jsx
import { useForm } from 'react-hook-form';

function ProfileForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { name: '' },
  });

  const onSubmit = (data) => console.log(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <label htmlFor="name">Name</label>
      <input id="name" {...register('name', { required: 'Name is required' })} />
      {errors.name && <p role="alert">{errors.name.message}</p>}
      <button type="submit">Save</button>
    </form>
  );
}
```

- `register(name, rules)` returns `{ name, onChange, onBlur, ref }`; spreading it connects the input.
- `handleSubmit(onValid)` prevents the default submit, validates, and calls `onValid(data)` only when everything passes. Otherwise it focuses the first invalid field.
- `formState.errors.name.message` holds the message of the failing rule.

## Built-in rules

```jsx
register('email', {
  required: 'Email is required',
  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
});
register('age', { valueAsNumber: true, min: { value: 18, message: 'Adults only' } });
register('password', { minLength: { value: 8, message: 'At least 8 characters' } });
register('username', { validate: (value) => value !== 'admin' || 'This name is reserved' });
```

Rules mirror HTML constraints (`required`, `min`, `max`, `minLength`, `maxLength`, `pattern`) plus custom `validate` functions, which may be async. For larger forms, a schema resolver (next lesson) replaces these rules.

## Validation mode

`useForm({ mode })` controls **when** fields are validated before the first submit:

- `onSubmit` (default): only on submit; after that, fields re-validate on change (`reValidateMode`).
- `onBlur`, `onChange`, `onTouched` (first blur, then every change), `all`.

## `formState` is a subscription

`formState` is a Proxy: RHF only re-renders for the properties you **read during render**. Destructure what you need (`errors`, `isSubmitting`, `isDirty`, `isValid`, `isSubmitSuccessful`); reading them inside callbacks does not subscribe.

## Async submit and server errors

If `onSubmit` returns a promise, `isSubmitting` is `true` until it settles. Errors that only the server can detect go into the form with `setError`:

```jsx
const { setError, formState: { errors, isSubmitting } } = useForm();

async function onSubmit(data) {
  try {
    await api.login(data);
  } catch (error) {
    setError('root.serverError', { message: error.message });
  }
}

<button disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</button>;
{errors.root?.serverError && <p role="alert">{errors.root.serverError.message}</p>}
```

Errors under `root` are not tied to a field and are cleared on the next submit.

## Other tools

- `watch('field')` / `useWatch({ name })`: read live values for conditional UI.
- `reset(values?)`: restore defaults, for example after a successful save.
- `<Controller>` / `useController`: wrap **controlled** third-party components (date pickers, selects from UI libraries) that cannot take a ref.
- `useFieldArray`: dynamic lists of fields.
- `setValue`, `getValues`, `trigger`: imperative control.

## Legacy vs modern

**Formik** (2017) made forms declarative with controlled inputs and Yup schemas; it re-renders on each keystroke and is now rarely updated. **redux-form** stored every keystroke in Redux and is deprecated. RHF became the default thanks to its performance and hooks API. React 19 form actions are another option for simple forms, especially with server functions.

## Pitfalls

- Forgetting to spread `register` on the input: the field is never collected.
- Reading `formState.errors` without destructuring it during render: no re-render when errors change.
- Using `value=` together with `register` turns the input controlled and fights RHF; use `defaultValues` instead.
- `handleSubmit(onSubmit)` must receive the function, not call it: `onSubmit={handleSubmit(onSubmit)}`.
- Numbers come back as strings unless you use `valueAsNumber` or a schema with coercion.
