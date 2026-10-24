The `LoginForm` works for mouse users, but the test suite (written with accessible queries) cannot find anything. Fix the **markup** so the tests pass. `LoginForm` is a **named export** receiving an `onSubmit` callback.

Required result:

- An `<h1>` with the text `Sign in to the Dojo`.
- The logo image has the accessible name `Dojo logo` (use `alt`).
- The email field is labeled `Email` and the password field is labeled `Password` (real `<label>` elements).
- The checkbox is labeled `Remember me`.
- The submit control is a real `<button type="submit">` named `Sign in`, so pressing **Enter** in a field also submits.
- When the form is submitted with an empty email or password, show `Email and password are required` in an element with `role="alert"` and do **not** call `onSubmit`.
- With valid input, call `onSubmit({ email, password, remember })` once.

The state logic is already written: you only need to change the JSX.
