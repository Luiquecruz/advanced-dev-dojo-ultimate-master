## One schema, many uses

Rule functions (previous lesson) work, but the same rules usually exist elsewhere too: the API client, the server, TypeScript types. A **schema library** describes the shape once and gives you validation *and* types. **Zod** is the most popular choice, and Zod 4 is faster, smaller and has a cleaner API than v3.

```ts
import { z } from 'zod';

export const signupSchema = z
  .object({
    email: z.email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

export type SignupValues = z.infer<typeof signupSchema>;
// { email: string; password: string; confirm: string }
```

### parse vs safeParse

```ts
signupSchema.parse(data);       // returns data or THROWS a ZodError
const result = signupSchema.safeParse(data); // never throws
if (result.success) result.data;
else result.error.issues;       // [{ path: ['email'], message: 'Enter a valid email', code: ... }]
```

Use the `Async` variants (`safeParseAsync`) when a refinement is async. `z.input<T>` and `z.output<T>` differ when the schema transforms values (e.g. `z.coerce.number()` or `.transform()`).

### Zod 3 vs Zod 4

| Zod 3 | Zod 4 |
| --- | --- |
| `z.string().email()` | `z.email()` (top-level formats: `z.url()`, `z.uuid()`, `z.iso.date()`...) |
| `{ message: '...' }` or `errorMap` | `{ error: '...' }` or a string; `message` still accepted |
| `error.errors` | `error.issues` |
| `.superRefine` | `.check()` / `.superRefine` still available |

Zod 4 also implements **Standard Schema**, a shared interface (`~standard`) that libraries like Valibot and ArkType implement too, so tools can accept any of them.

## Connecting a schema to VeeValidate

VeeValidate's `useForm` accepts a `TypedSchema`: any object with `__type: 'VVTypedSchema'` and an async `parse(values)` that returns `{ value?, errors: [{ path, errors }] }`. The official adapters (`@vee-validate/zod`, `@vee-validate/yup`, `@vee-validate/valibot`) are thin wrappers:

```ts
import { toTypedSchema } from '@vee-validate/zod';
const { errors, handleSubmit } = useForm({ validationSchema: toTypedSchema(signupSchema) });
```

Writing that adapter yourself takes about fifteen lines: run `safeParseAsync`, return the data on success, and group `issue.message` by `issue.path.join('.')` on failure. With a typed schema, `handleSubmit((values) => ...)` receives the schema's **output** type.

## Cross-field validation

Rules that depend on several fields (password confirmation, date ranges) belong on the **object** with `.refine` and a `path` so the error lands on the right field. Without `path`, the issue is attached to the root (`''`) and no field shows it.

## Where else to use the schema

- Validate API responses before trusting them: `UserSchema.parse(await response.json())`.
- Share it with the server (Nuxt server routes, tRPC, Hono) so client and server agree.
- Parse route query strings: `z.coerce.number().int().positive().catch(1).parse(route.query.page)`.

## Pitfalls

- `parse` throws: in UI code prefer `safeParse`.
- Object refinements only run when the base object is valid. If `email` is invalid, the password confirmation check is skipped until that is fixed.
- Empty inputs are `''`, not `undefined`: `z.string().optional()` still accepts `''`. Use `.min(1, 'Required')` for required strings.
