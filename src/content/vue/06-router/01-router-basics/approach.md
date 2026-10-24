1. In `router.ts`, add one record per page to the `routes` array, giving each a `path`, a `name` and a `component`.
2. Put the catch-all record last with the `/:pathMatch(.*)*` pattern so unknown URLs fall through to `NotFoundView`.
3. In `App.vue`, add two `RouterLink`s inside `<nav>` whose `:to` is a `{ name }` location object.
4. Place `<RouterView />` inside `<main>`; the router swaps the matched view in and out and adds `router-link-active` to the active link for you.
