Start with the leaf files. In `slugify.ts`, put `export default` in front of the function declaration. In `ids.ts`, change the import specifier from `'crypto'` to `'node:crypto'`.
---
`main.ts` needs two kinds of statements: imports to **use** `slugify` and `createId` inside `createPost`, and re-exports to **expose** them. An import alone does not make a name part of your exports.
---
A default export can be re-exported under a name with `export { default as slugify } from './slugify.ts';`. Named exports re-export as they are: `export { createId } from './ids.ts';`. Then `createPost` returns `{ id: createId('post'), slug: slugify(title), title }`.
