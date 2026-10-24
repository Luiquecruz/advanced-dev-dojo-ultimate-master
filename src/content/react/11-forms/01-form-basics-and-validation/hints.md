In `handleChange`, read `const { name, value } = event.target;` and update with `setValues((current) => ({ ...current, [name]: value }))`.
---
Errors do not need their own state: `const errors = submitted ? validate(values) : {};` recomputes them on every render.
---
In `handleSubmit`: `event.preventDefault(); setSubmitted(true);` then check `Object.keys(validate(values)).length === 0` before calling `onSubmit(values)`.
---
In `Field`, pass `aria-invalid={error ? 'true' : undefined}` and `aria-describedby={error ? errorId : undefined}`; `undefined` removes the attribute.
