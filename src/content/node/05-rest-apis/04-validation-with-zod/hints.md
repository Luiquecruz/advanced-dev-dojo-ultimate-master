The schemas are chains: `z.string().trim().min(2)`, `z.email()`, `z.number().int().min(13).optional()`, `z.enum(['admin', 'member']).default('member')`. The query string is text, so `page` needs `z.coerce.number()`.
---
`formatIssues` is one `map`: `issue.path.map(String).join('.')` gives `'tags.0'` for `['tags', 0]`.
---
Write the hook once and pass it as the third argument of both validators: `(result, c) => { if (!result.success) return c.json({ error: 'Validation failed', issues: formatIssues(result.error.issues) }, 400); }`. In the handlers, replace the raw reads with `c.req.valid('json')` and `c.req.valid('query')`.
