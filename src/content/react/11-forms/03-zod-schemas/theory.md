## One schema, two jobs

Validation rules written inline in components are hard to share with the server, and TypeScript types for the same data drift apart from them. **Zod** solves both: you describe the shape of the data once, and get

- **runtime validation** with error messages, and
- a **static type** inferred from the schema.

```ts
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Enter a valid email'),
  age: z.number().int().min(18),
});

type User = z.infer<typeof userSchema>;
```

The same schema can validate a form on the client, an API request on the server, and an API response.

## `parse` vs `safeParse`

```js
userSchema.parse(data);
const result = userSchema.safeParse(data);
if (result.success) {
  console.log(result.data);
} else {
  console.log(result.error.issues);
}
```

`parse` returns the data or throws a `ZodError`. `safeParse` never throws and returns a discriminated result, which is what you want in forms. Each issue has a `path` (for example `['email']`) and a `message`.

To turn issues into per-field messages, use `z.flattenError`:

```js
const { fieldErrors } = z.flattenError(result.error);
fieldErrors.email;
```

`fieldErrors.email` is an array of messages, such as `['Enter a valid email']`. `z.treeifyError` builds a nested structure for nested objects, and `z.prettifyError` produces a readable string.

## Parsing transforms data

A schema's **output** can differ from its **input**. That matters for forms, where every input value is a string:

```js
const schema = z.object({
  username: z.string().trim().min(3),
  age: z.coerce.number().int().min(18),
});

schema.parse({ username: '  ada  ', age: '30' });
```

The result is `{ username: 'ada', age: 30 }`: `trim()` cleaned the string and `z.coerce.number()` converted `'30'` into `30`. `z.input<typeof schema>` and `z.output<typeof schema>` give the two types.

## Cross-field rules with `refine`

Rules involving several fields go on the object, with `path` telling which field shows the message:

```js
const signupSchema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: 'Passwords do not match',
    path: ['confirmPassword'],
  });
```

`superRefine` (or `.check`) gives full control to add several issues at once.

## Zod 3 vs Zod 4

Zod 4 is faster, smaller and changed several APIs. Code you find online is often Zod 3:

| Zod 3 | Zod 4 |
| --- | --- |
| `z.string().email()` | `z.email()` (top-level formats: `z.url()`, `z.uuid()`, `z.iso.date()`) |
| `{ message: '...' }` | `{ error: '...' }` (`message` still works but is deprecated) |
| `invalid_type_error`, `required_error`, `errorMap` | one `error` option, which can be a function |
| `error.flatten()`, `error.format()` | `z.flattenError(error)`, `z.treeifyError(error)` |
| `z.object().strict()` | `z.strictObject()` (method still exists) |

A string is still accepted as shorthand: `.min(8, 'Too short')`. There is also `zod/mini`, a tree-shakable functional API for bundle-sensitive apps.

## Zod with React Hook Form

The `@hookform/resolvers` package adapts schema libraries to RHF. Version 5 supports Zod 4 with the same import:

```jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(signupSchema),
});
```

With a resolver you **remove the inline rules** from `register`. On submit, RHF runs the schema, maps each issue's `path` to `errors[field].message`, and passes the **parsed output** (trimmed, coerced) to your submit handler.

## Alternatives

- **Yup**: the schema library of the Formik era, still common in older code.
- **Valibot**: modular, very small bundles.
- **ArkType**: TypeScript-like string syntax.

Zod 4, Valibot and ArkType implement **Standard Schema**, a shared interface that lets libraries (form libraries, routers, tRPC) accept any of them.

## Pitfalls

- Validating numbers from inputs with `z.number()` fails because values are strings: use `z.coerce.number()` or `valueAsNumber`.
- `z.coerce.number()` turns an empty string into `0`; add `.min()` or a custom check to catch "empty".
- Forgetting `path` in an object `refine` attaches the error to the root, so no field shows it.
- Mixing inline `register` rules with a resolver: the resolver wins and the inline rules are ignored.
