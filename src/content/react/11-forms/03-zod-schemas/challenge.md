Describe a sign-up form with a **Zod 4** schema and plug it into React Hook Form with `zodResolver`.

**`schema.js`** — export `signupSchema`, a `z.object` with:

| Field | Schema | Message |
| --- | --- | --- |
| `username` | string, `trim()`, min 3 | `Username must be at least 3 characters` |
| `email` | `z.email()` (Zod 4 top-level format, not `z.string().email()`) | `Enter a valid email` |
| `age` | `z.coerce.number()`, integer, min 18 | `You must be at least 18` |
| `password` | string, min 8 | `Password must be at least 8 characters` |
| `confirmPassword` | string | |

Add `.refine(...)` on the object so `confirmPassword` must equal `password`, with the message `Passwords do not match` and `path: ['confirmPassword']`.

**`App.jsx`** — in `SignupForm({ onSubmit })`:

- pass `resolver: zodResolver(signupSchema)` to `useForm`;
- below each input render `errors[field.name].message` in a `<p>` when present.

The inputs (labelled `Username`, `Email`, `Age`, `Password`, `Confirm password`) and the `Sign up` button are already there. `onSubmit` must receive the **parsed output**: the trimmed username and `age` as a number.
