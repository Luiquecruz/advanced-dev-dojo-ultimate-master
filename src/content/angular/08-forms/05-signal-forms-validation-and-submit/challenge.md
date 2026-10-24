Add validation and submission to a Signal Forms signup in `SignupForm` (`app.ts`). Inputs and the `registered` message are already wired.

1. In the schema function of `form(this.model, (path) => { ... })`:
   - `email`: `required` with message `Email is required`, `email` with message `Enter a valid email`
   - `password`: `required` with message `Password is required`, `minLength(path.password, 8, ...)` with message `Password must be at least 8 characters`
   - `confirmPassword`: a `validate()` rule returning `{ kind: 'mismatch', message: 'Passwords do not match' }` when it differs from the password, `undefined` otherwise
2. For each of the three fields, when the field is **touched**, render every error of `errors()` as a `<p>` showing `error.message`.
3. Disable `Create account` while `signupForm().submitting()`.
4. `onSubmit()` calls `submit(this.signupForm, async (field) => { ... })`:
   - load `GET /api/users` with `HttpClient`;
   - if a user already has that email, return `{ fieldTree: field.email, kind: 'server', message: 'Email already registered' }`;
   - otherwise set `registered` to the email and return `undefined`.

`submit()` marks every field as touched and skips the action while the form is invalid.
