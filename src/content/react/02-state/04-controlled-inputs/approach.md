1. Add four `useState` calls with the initial values from the table.
2. Bind each field with `value`/`checked` and an `onChange` that writes `event.target.value` (or `.checked`) into state.
3. Transform the username inside its `onChange` before storing it, so the field always shows the normalized value.
4. Compute `trimmedName` and `canSubmit` during render; use them for the greeting and the button's `disabled`.
5. In `handleSubmit`, keep `preventDefault()` and call `onSubmit` with an object built from state.
