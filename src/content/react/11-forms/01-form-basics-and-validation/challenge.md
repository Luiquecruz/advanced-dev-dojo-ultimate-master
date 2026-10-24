Build a sign-up form with plain React state, a pure validation function and accessible error messages.

**`validate(values)`** (named export) receives `{ name, email, password }` and returns an object with only the failing fields:

| Field | Rule | Message |
| --- | --- | --- |
| `name` | not empty after `trim()` | `Name is required` |
| `email` | matches `/^\S+@\S+\.\S+$/` | `Enter a valid email` |
| `password` | at least 8 characters | `Password must be at least 8 characters` |

A valid form returns `{}`.

**`SignupForm({ onSubmit })`** (named export):

- Controlled inputs labelled `Name`, `Email` and `Password`, updated by one `handleChange` using the input's `name`.
- A `Sign up` submit button. Submitting calls `event.preventDefault()`.
- No errors are shown before the first submit. After it, errors are **derived** from `validate(values)` on every render, so they disappear as soon as a field is fixed.
- Each invalid input has `aria-invalid="true"` and `aria-describedby` set to the id of a `<p>` containing its message (`{name}-error`). Valid inputs have neither attribute.
- `onSubmit(values)` is called only when `validate(values)` returns no errors.
