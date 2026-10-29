Query values are strings, so the schema needs `z.coerce.number()`. The clamp is a transform after validation: `.int().min(1).default(10).transform((limit) => Math.min(limit, 50))`. The sort whitelist is a `z.enum([...])`.
---
Sort a copy (`[...filtered].sort(...)`). A comparator can read the direction from the leading `-` and the field from the rest: `const direction = sort.startsWith('-') ? -1 : 1; const field = sort.replace('-', '')`. Fall back to `a.id - b.id` when values are equal.
---
`decodeCursor` wraps `JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'))` in `try/catch` and checks `typeof value?.id === 'number'`. In the feed: `const remaining = products.filter((p) => p.id > after)`, `items = remaining.slice(0, limit)`, and `nextCursor = remaining.length > limit ? encodeCursor(items[items.length - 1].id) : null`.
