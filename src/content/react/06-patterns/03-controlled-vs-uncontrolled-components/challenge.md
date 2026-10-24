Build one uncontrolled form, one component that supports both modes, and use it controlled.

1. **`export function NewsletterForm({ defaultEmail = '', onSubscribe })`** is **uncontrolled**:
   - a `<form aria-label="Newsletter">` with an `<input name="email" aria-label="Email">` using **`defaultValue={defaultEmail}`** (no `value`, no state) and a `<button>` **`Subscribe`**,
   - on submit: prevent the default, read the email with **`FormData`**, call `onSubscribe(email)`, then reset the form.
2. **`export function Stepper({ value, defaultValue = 0, onChange })`** renders a `<button>` **`-`**, an `<output>` with the current number and a `<button>` **`+`** (each click changes by 1).
   - **Controlled** when `value !== undefined`: show `value`, call `onChange(next)`, never change on its own.
   - **Uncontrolled** otherwise: keep internal state starting at `defaultValue`, and still call `onChange(next)` when provided.
3. **`export default function App()`** keeps `quantity` (initially `1`) in state, renders a **controlled** `<Stepper>`, a `<p>` with `Quantity: {quantity}` and a `<button>` **`Reset`** that sets `quantity` to `0`.
