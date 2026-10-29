Wire a tiny package of three ES modules. The logic already exists; your job is the imports and exports. `main.ts` is the package's public entry point, like the `"."` entry of an `exports` map.

Files:

| File | What it must export |
| --- | --- |
| `slugify.ts` | `slugify(text)` as the **default** export (no named export needed) |
| `ids.ts` | named `createId(prefix)` and `isId(value, prefix)` (already exported); `randomUUID` must be imported from `'node:crypto'`, with the prefix |
| `main.ts` | named exports `slugify`, `createId` and `createPost`, and nothing else at runtime |

Rules:

1. `createPost(title)` returns `{ id, slug, title }` where `id` is `createId('post')` (`post_` followed by a UUID) and `slug` is `slugify(title)`. Example: `createPost('Modules in Node 24').slug` is `'modules-in-node-24'`.
2. `main.ts` re-exports the **same functions** the other files export (`mod.slugify === modules['slugify.ts'].default`), so it needs a re-export that renames the default export to `slugify`.
3. `isId` stays internal: do not re-export it from `main.ts` and do not use `export *`. The `Post` interface may stay exported (types disappear at runtime).
4. Write relative imports with the file extension (`'./ids.ts'`), as Node ESM requires.
