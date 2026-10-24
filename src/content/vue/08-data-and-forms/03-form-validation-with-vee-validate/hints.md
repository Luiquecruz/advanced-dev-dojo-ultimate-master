A rule is any function `(value) => true | string`. `return value.length >= 8 || 'Password must be at least 8 characters'` uses `||` to return the message only when the check fails.
---
`useForm({ initialValues: { email: '', password: '' }, validationSchema: { email: validateEmail, password: validatePassword } })`.
---
`errors` is a computed ref keyed by field name. In the template: `<p v-if="errors.email" class="error">{{ errors.email }}</p>`.
---
`const onSubmit = handleSubmit((values) => { welcome.value = \`Welcome, ${values.email}!\` })`. The callback only runs after every field passes validation.
