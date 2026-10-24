Validate a sign-up form with **VeeValidate**. The inputs are already bound with `defineField`.

1. Complete the two validators. A VeeValidate rule returns `true` when valid or an error **message** string:
   - `validateEmail`: `"Email is required"` when empty, `"Enter a valid email"` when the value does not look like `name@domain.tld`.
   - `validatePassword`: `"Password must be at least 8 characters"` when shorter than 8 characters.
2. Call `useForm` with `initialValues` (`{ email: '', password: '' }`) and a `validationSchema` object mapping `email` and `password` to their validators.
3. Render `errors.email` and `errors.password` below their inputs, each in a `<p class="error">`, only when present.
4. Create `onSubmit` with `handleSubmit(...)` so that, only when the whole form is valid, it sets `welcome` to `` `Welcome, ${email}!` ``. `handleSubmit` also prevents the default browser submit.
