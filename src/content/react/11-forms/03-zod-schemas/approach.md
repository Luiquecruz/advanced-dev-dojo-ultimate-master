1. Replace each placeholder field schema with the real rule and its message; use the Zod 4 top-level `z.email()` format.
2. Use `trim()` and `z.coerce.number()` so the schema's output is already clean data, not raw input strings.
3. Add the password confirmation with `.refine` on the object, pointing `path` at `confirmPassword` so the form knows where to show it.
4. Plug the schema into RHF with `zodResolver`; the inline `register` rules are no longer needed.
5. Render `errors[field.name].message` for every field: the resolver maps each Zod issue path to a field error.
6. `handleSubmit` now passes the schema's parsed output to `onSubmit`, so the username arrives trimmed and the age as a number.
