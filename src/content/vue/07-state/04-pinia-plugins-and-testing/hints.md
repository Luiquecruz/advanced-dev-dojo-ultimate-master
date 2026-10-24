The context object passed to a plugin has `store`, `options`, `pinia` and `app`. `options.persist` is whatever you passed when defining the store.
---
Restore before subscribing: `const saved = localStorage.getItem(key); if (saved) store.$patch(JSON.parse(saved));`.
---
`store.$subscribe((mutation, state) => localStorage.setItem(key, JSON.stringify(state)), { flush: 'sync' })`. Without `flush: 'sync'`, the callback waits for the next tick.
---
Plugins added with `pinia.use()` only run once Pinia is installed in an app, which is why the tests create a throwaway app with `createApp({}).use(pinia)`.
