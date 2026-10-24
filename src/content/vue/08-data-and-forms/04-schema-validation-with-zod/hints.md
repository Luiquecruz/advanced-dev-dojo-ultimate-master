Zod 4 has top-level string formats: `z.email('Enter a valid email')`. Lengths use `z.string().min(8, 'message')`.
---
Cross-field rules go on the object: `z.object({...}).refine((v) => v.password === v.confirm, { message: 'Passwords do not match', path: ['confirm'] })`.
---
`safeParseAsync` never throws. A failed result has `result.error.issues`, each with `path` (an array like `['email']`) and `message`.
---
Group messages with a `Map<string, string[]>` keyed by `issue.path.join('.')`, then convert it with `[...map].map(([path, errors]) => ({ path, errors }))`.
