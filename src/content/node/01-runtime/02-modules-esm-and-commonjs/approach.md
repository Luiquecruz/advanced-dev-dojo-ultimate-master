1. Decide each module's surface first: `slugify.ts` has one thing to offer, so a default export fits; `ids.ts` offers several helpers, so named exports fit.
2. Fix the leaves: add `export default` to `slugify`, and switch the crypto import to the `node:` prefix so it can never resolve to an npm package.
3. In `main.ts`, import what `createPost` uses: a default import for `slugify` (you pick the local name) and a named import for `createId`.
4. Expose the public API with explicit re-exports. The default export of `slugify.ts` needs `default as slugify` to become a named export of `main.ts`.
5. Leave `isId` out and avoid `export *`: the entry file decides what consumers can depend on, which is the same job an `exports` map does for a published package.
6. Check with **Run**: `main.ts` logs a post with a `post_` id and a slug.
