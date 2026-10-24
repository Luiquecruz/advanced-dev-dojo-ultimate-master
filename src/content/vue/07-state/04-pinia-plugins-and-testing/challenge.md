Write a Pinia plugin that persists opted-in stores to `localStorage`.

**`persist.ts`** — `persistPlugin(context)` runs once for every store. The `persist?: boolean` option is already declared on `DefineStoreOptionsBase`, so stores can opt in with `persist: true` (option stores put it in the options object; setup stores pass it as the third argument of `defineStore`).

1. Do nothing for stores whose `options.persist` is not `true`.
2. Use the key `` `pinia:${store.$id}` ``. If something is saved under it, parse the JSON and apply it with `store.$patch(...)`.
3. Subscribe to the store with `store.$subscribe` and write `JSON.stringify(state)` under the same key after every change. Pass `{ flush: 'sync' }` so the write happens immediately.

**`main.ts`** — register the plugin on the Pinia instance in `configureApp` with `pinia.use(persistPlugin)`.

`stores.ts` defines `settings` (option store, persisted), `recent` (setup store, persisted) and `draft` (not persisted).
