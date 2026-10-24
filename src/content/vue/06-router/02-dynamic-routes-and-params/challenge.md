Build a user profile page driven by a dynamic route segment. `App.vue`, `NotFoundView.vue` and `main.ts` are done.

**`router.ts`** — add a route record:

- path `/users/:id` where `id` only accepts **digits** (so `/users/abc` falls through to `not-found`),
- name `user`,
- component `UserView`,
- `props: true`, so the param reaches the component as a prop.

**`UserView.vue`**

1. Declare a required `id` prop of type `string` (do not read `useRoute()`; the component must work when mounted without a router).
2. Fetch `GET /api/users/:id` when the component is created **and again whenever `id` changes**. Navigating from `/users/1` to `/users/2` reuses the same component instance, so `onMounted` alone is not enough.
3. While loading, show a `<p>`; once loaded, render the user's `name` in an `<h2>` and their `email` in a `<p>`.
