## What guards are for

Navigation guards run code **while a navigation is in progress**, before the new view renders. They can let it continue, cancel it or redirect it. Typical uses: authentication, permissions, "unsaved changes" prompts, analytics and page titles.

## The navigation pipeline

For a navigation from `A` to `B`, Vue Router calls, in order:

1. `onBeforeRouteLeave` in the components being left (A),
2. global `router.beforeEach`,
3. `onBeforeRouteUpdate` in reused components,
4. `beforeEnter` on the target route records,
5. resolve lazy components, then global `router.beforeResolve`,
6. the URL changes and global `router.afterEach` runs (cannot cancel anything),
7. the DOM updates.

Any guard may be `async`; the router waits for the returned promise.

## Return values (modern) vs `next()` (legacy)

```ts
router.beforeEach(async (to, from) => {
  if (to.meta.requiresAuth && !auth.user) {
    return { name: 'login', query: { redirect: to.fullPath } }; // redirect
  }
  if (to.name === 'admin' && !(await canAccessAdmin())) {
    return false;                                              // cancel
  }
  // returning nothing (or true) continues
});
```

Vue Router 3 (Vue 2) only had the third `next` argument, and every code path had to call it exactly once:

```ts
// ❌ legacy: easy to forget or call twice
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !auth.user) next('/login');
  else next();
});
```

`next` still works in Vue Router 5 but now logs a **deprecation warning**; it will be removed in Vue Router 6. Return values are shorter and impossible to call twice.

## Route meta

`meta` attaches arbitrary data to records. Type it once by augmenting `RouteMeta`:

```ts
declare module 'vue-router' {
  interface RouteMeta {
    title: string;
    requiresAuth?: boolean;
  }
}
```

`to.meta` merges the meta of every matched record (parent and children), so a `requiresAuth` on a parent protects all its children.

## Per-route and in-component guards

```ts
{ path: '/admin', component: AdminView, beforeEnter: (to) => isAdmin() || { name: 'home' } }
```

`beforeEnter` only runs when *entering* the route, not when params, query or hash change.

Inside a component, the Composition API offers:

```ts
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';

onBeforeRouteLeave(() => {
  if (dirty.value && !window.confirm('Discard unsaved changes?')) return false;
});

onBeforeRouteUpdate(async (to) => {
  user.value = await fetchUser(to.params.id);
});
```

These replace the Options API `beforeRouteLeave` / `beforeRouteUpdate` options.

## afterEach

`router.afterEach((to, from, failure) => { ... })` runs after every navigation, including failed ones (inspect `failure` with `isNavigationFailure`). It cannot change the navigation, which makes it ideal for page titles, analytics and focus management.

## Pitfalls

- **Infinite redirect loops**: redirecting to `login` from a guard that also protects `login`. Always check the condition against the target.
- **Client guards are not security**. They improve UX; the server must still reject unauthorized API calls.
- **Reading the redirect query blindly**: `route.query.redirect` can be an array or an external URL. Validate it before navigating.
- **Using `push` after login** leaves `/login` in history so "Back" returns to it; `replace` avoids that.
