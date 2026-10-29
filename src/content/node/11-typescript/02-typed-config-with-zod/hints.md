Every value in the environment is a string or missing. Numbers need `z.coerce.number()`, booleans `z.stringbool()`, and defaults go on the schema with `.default(...)`. For the list: `z.string().default('').transform((value) => value.split(',').map((item) => item.trim()).filter(Boolean))`.
---
Chain `.superRefine((env, ctx) => { ... })` on the object and call `ctx.addIssue({ code: 'custom', path: ['SESSION_SECRET'], message: 'Required in production' })` when `env.NODE_ENV === 'production' && !env.SESSION_SECRET`.
---
In `loadConfig`: `const result = envSchema.safeParse(env)`. On failure, map `result.error.issues` to `{ variable: String(issue.path[0]), message: issue.message }` and throw `new ConfigError(...)`. The constructor builds its message from `issues.map((issue) => issue.variable).join(', ')`. On success, `return Object.freeze(result.data)`.
