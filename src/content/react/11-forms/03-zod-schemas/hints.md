Each message can be passed as a string shorthand: `z.string().trim().min(3, 'Username must be at least 3 characters')`, `z.email('Enter a valid email')`.
---
Form inputs always produce strings. `z.coerce.number().int().min(18, '...')` converts `'36'` into `36` before checking it.
---
Chain the cross-field rule on the object: `z.object({...}).refine((data) => data.password === data.confirmPassword, { error: 'Passwords do not match', path: ['confirmPassword'] })`.
---
In `App.jsx`: `useForm({ resolver: zodResolver(signupSchema), defaultValues: ... })` and `{errors[field.name] && <p>{errors[field.name].message}</p>}`.
