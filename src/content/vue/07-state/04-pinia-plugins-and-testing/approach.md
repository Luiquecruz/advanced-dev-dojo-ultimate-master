1. Return early from `persistPlugin` when `options.persist` is falsy.
2. Build the key from `store.$id` and restore any saved JSON with `store.$patch`.
3. Call `store.$subscribe` with a callback that serializes `state` into `localStorage`, using `{ flush: 'sync' }`.
4. In `main.ts`, call `pinia.use(persistPlugin)` before `app.use(pinia)`.
