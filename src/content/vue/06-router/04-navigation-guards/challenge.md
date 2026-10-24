Protect a dashboard, set page titles and stop users from losing an unsaved draft. `auth.ts` exports a reactive `auth` object with `user` (`string | null`), `login(name)` and `logout()`. Every route already declares `meta.title`, and `/dashboard` declares `meta.requiresAuth: true`.

**`router.ts`**

1. Register a global `beforeEach` guard: when the target route has `meta.requiresAuth` and `auth.user` is `null`, redirect to the route named `login` with the original destination in the query: `/login?redirect=/dashboard`. Return the new location instead of calling the deprecated `next()`.
2. Register an `afterEach` hook that sets `document.title` to `` `${meta.title} · Dojo` `` (for example `Dashboard · Dojo`).

**`LoginView.vue`** — after `auth.login('Ada')`, **replace** the current location with the `redirect` query value, or `/` when it is missing.

**`EditorView.vue`** — with `onBeforeRouteLeave`, when `draft` is not empty call `window.confirm('Discard unsaved changes?')`. Cancel the navigation when it returns `false`. With an empty draft, do not ask.
