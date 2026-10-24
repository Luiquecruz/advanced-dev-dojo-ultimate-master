Build a login form with **React Hook Form**: built-in rules, async submit state and a server error.

Export `LoginForm({ onLogin })`, where `onLogin(data)` is an async function that may reject.

- Call `useForm({ defaultValues: { email: '', password: '' } })`.
- `Email` input (`<label htmlFor="email">`, `id="email"`), registered as `email` with:
  - `required`: `Email is required`
  - `pattern` `/^\S+@\S+\.\S+$/`: `Enter a valid email`
- `Password` input (`id="password"`), registered as `password` with:
  - `required`: `Password is required`
  - `minLength` 8: `Password must be at least 8 characters`
- Show each field's `errors.<field>.message` in a `<p>` below the input.
- Submit with `onSubmit={handleSubmit(onSubmit)}`. `onSubmit` awaits `onLogin(data)`, so `onLogin` receives `{ email, password }` only when the form is valid.
- If `onLogin` rejects, call `setError('root.serverError', { message: error.message })` and render that message in `<p role="alert">`.
- The submit button reads `Log in`; while `isSubmitting` it is **disabled** and reads `Logging in...`.

Try it in the preview: the demo accepts the password `password123`.
