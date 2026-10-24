1. Implement `validate` as a pure function returning only the failing fields; test it mentally with empty and valid values.
2. Write a single `handleChange` that uses computed property names (`[name]: value`) so every input shares it.
3. Track only *whether* the user has submitted. Derive `errors` from the current values during render instead of storing them.
4. In `handleSubmit`, prevent the default navigation, flag the form as submitted and call `onSubmit` only when there are no errors.
5. In `Field`, connect the error message to the input with `aria-describedby` and mark the input with `aria-invalid`, rendering the message only when an error exists.
