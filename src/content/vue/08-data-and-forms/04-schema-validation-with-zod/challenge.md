Describe the sign-up rules once with **Zod 4** and plug them into VeeValidate through a small adapter. `App.vue` is complete: it calls `useForm({ validationSchema: toTypedSchema(signupSchema) })`.

**`schema.ts`** — complete `signupSchema` (an object with `email`, `password` and `confirm`):

1. `email`: a valid email address, message `"Enter a valid email"`.
2. `password`: at least 8 characters, message `"Password must be at least 8 characters"`.
3. A cross-field check: `confirm` must equal `password`, message `"Passwords do not match"`, reported on the path `["confirm"]`.

**`toTypedSchema.ts`** — VeeValidate accepts any object shaped like its `TypedSchema` interface (`{ __type: 'VVTypedSchema', parse }`). Implement `parse(values)`:

1. Run `schema.safeParseAsync(values)`.
2. On success, return `{ value: result.data, errors: [] }`.
3. On failure, return `{ errors }` where `errors` has **one entry per field path**: `{ path: issue.path.join('.'), errors: [...messages for that path] }`, in the order the paths first appear.

This is what the official `@vee-validate/zod` package does; writing it yourself shows how little magic is involved.
