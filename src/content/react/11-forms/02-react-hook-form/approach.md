1. Initialize the form with `useForm` and `defaultValues`; destructure `formState` during render so RHF subscribes to `errors` and `isSubmitting`.
2. Register both inputs with their rules, using the `{ value, message }` form for `pattern` and `minLength` so each rule has its own message.
3. Render each field's message from `errors`, which RHF fills only for failing rules.
4. Pass `handleSubmit(onSubmit)` to the form: it prevents the default submit, validates and calls `onSubmit` with clean data only when valid.
5. Make `onSubmit` async and await `onLogin`; the returned promise drives `isSubmitting`, which disables the button and changes its label.
6. Catch the rejection and store it as a `root` error with `setError`, then render it in an alert.
