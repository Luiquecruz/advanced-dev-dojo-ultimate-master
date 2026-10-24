A guard can return a value instead of calling `next()`: nothing (or `true`) continues, `false` cancels, and a route location redirects. `router.beforeEach((to) => { ... })`.
---
`to.fullPath` includes the path, query and hash, which is exactly what you want to restore after logging in: `return { name: 'login', query: { redirect: to.fullPath } }`.
---
In `LoginView`, read `useRoute().query.redirect` (it may be a string, an array or undefined) and call `useRouter().replace(...)` so the login page is not left in history.
---
`onBeforeRouteLeave(() => { if (draft.value && !window.confirm('Discard unsaved changes?')) return false; })` cancels the navigation only when needed.
