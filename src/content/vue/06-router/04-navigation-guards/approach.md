1. Add `router.beforeEach((to) => ...)` that returns `{ name: 'login', query: { redirect: to.fullPath } }` when `to.meta.requiresAuth && !auth.user`, and nothing otherwise.
2. Add `router.afterEach((to) => ...)` that writes `` `${to.meta.title} · Dojo` `` into `document.title`.
3. In `LoginView`, get `route` and `router`, then after logging in call `router.replace` with the string `redirect` query or `'/'`.
4. In `EditorView`, register `onBeforeRouteLeave` and return `false` only when the draft is non-empty and `window.confirm` returns `false`.
