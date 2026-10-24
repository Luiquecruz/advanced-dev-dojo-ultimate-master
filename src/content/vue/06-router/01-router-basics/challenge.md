Wire up a small three-page app with Vue Router. The views are already written; you build the route table and the navigation shell.

**`router.ts`** — export a `router` created with `createRouter` and `createMemoryHistory()` (the playground cannot own the browser URL, so we use memory history; a real app would use `createWebHistory()`). Declare three **named** routes:

| path | name | component |
| --- | --- | --- |
| `/` | `home` | `HomeView` |
| `/about` | `about` | `AboutView` |
| any other path | `not-found` | `NotFoundView` |

**`App.vue`** — render:

1. A `<nav>` with two `<RouterLink>`s: `Home` (to the `home` route) and `About` (to the `about` route). Link to them **by name**.
2. A `<main>` containing `<RouterView />`.

`main.ts` already installs the router through `configureApp(app)`.
