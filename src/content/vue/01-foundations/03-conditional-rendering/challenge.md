Build a save-status panel in `App.vue`. The `status` ref and the buttons that change it (`Load`, `Succeed`, `Fail`, `Toggle help`) are already in the starter.

1. Render **exactly one** status paragraph with a `v-if` / `v-else-if` / `v-else` chain:
   - `status === 'loading'` → `<p>Loading...</p>`
   - `status === 'error'` → `<p role="alert">Something went wrong</p>`
   - `status === 'success'` → `<p>Saved!</p>`
   - otherwise → `<p>Nothing saved yet</p>`
2. Render `<aside>Press ? for shortcuts</aside>` with **`v-show`** bound to `showHelp`. It must stay in the DOM while hidden.
