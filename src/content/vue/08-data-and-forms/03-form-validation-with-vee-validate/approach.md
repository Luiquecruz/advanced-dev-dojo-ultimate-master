1. Implement both validators so they return `true` or the exact message strings.
2. Pass `initialValues` and the `validationSchema` object to `useForm`.
3. Add the two conditional error paragraphs with `class="error"`.
4. Replace the manual `onSubmit` with `handleSubmit((values) => ...)` and set `welcome` from `values.email`.
