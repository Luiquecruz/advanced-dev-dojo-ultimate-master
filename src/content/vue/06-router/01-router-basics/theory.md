## What a client-side router does

A single-page app loads one HTML document and then swaps components in and out as the URL changes. **Vue Router** is the official library for this: it maps URLs to components, keeps the browser history in sync and gives you links that navigate without a full page reload.

Vue Router 5 is a *transition release*: for apps that do not use file-based routing it is a drop-in replacement for v4 (same API, no code changes). Its big addition is that the former `unplugin-vue-router` (file-based routing and typed routes) now ships inside `vue-router` itself. Version 6 will remove deprecated APIs, so v5 is the place to clean them up.

## Creating a router

```ts
// router.ts
import { createRouter, createWebHistory } from 'vue-router';
import HomeView from './HomeView.vue';
import AboutView from './AboutView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/about', name: 'about', component: AboutView },
  ],
});
```

```ts
// main.ts
createApp(App).use(router).mount('#app');
```

Every entry in `routes` is a **route record**. The `name` is optional but recommended: links and redirects that use names keep working when you later change a path.

### History modes

| Function | URL looks like | Notes |
| --- | --- | --- |
| `createWebHistory()` | `/about` | Uses the History API. The server must fall back to `index.html` for unknown paths. |
| `createWebHashHistory()` | `/#/about` | Works on any static host, worse for SEO. |
| `createMemoryHistory()` | (not shown) | Keeps history in memory. Used for SSR, tests and embedded widgets. |

## Rendering: RouterView and RouterLink

```vue
<template>
  <nav>
    <RouterLink to="/">Home</RouterLink>
    <RouterLink :to="{ name: 'about' }">About</RouterLink>
  </nav>
  <RouterView />
</template>
```

- `<RouterView />` renders the component matched by the current URL.
- `<RouterLink>` renders an `<a>` with a real `href` (so middle-click and "open in new tab" work), but intercepts normal clicks to navigate client-side.
- The active link automatically gets `router-link-active` (the current route is the link's route or a child of it) and `router-link-exact-active` (exact match). Style these classes instead of computing "is active" by hand.

## Navigating from code

```ts
import { useRoute, useRouter } from 'vue-router';

const router = useRouter(); // the router instance: push, replace, back...
const route = useRoute();   // the current location: path, params, query, hash, meta

await router.push({ name: 'about' });
router.replace('/login'); // no new history entry
router.back();
```

`router.push` returns a promise that resolves when the navigation finishes (or with a *navigation failure* if a guard cancelled it).

## Not-found pages

Routes are matched by specificity, so a catch-all can live anywhere in the array, but placing it last keeps the intent obvious:

```ts
{ path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView }
```

`pathMatch` is a param with a custom regex `(.*)` that matches slashes too; the trailing `*` makes it repeatable so `route.params.pathMatch` becomes an array of segments.

## Pitfalls

- **Forgetting `:` on `to`**: `to="{ name: 'about' }"` is a literal string. Use `:to` for objects.
- **Using `<a href>` for internal links** causes a full reload and loses app state.
- **`createWebHistory` without a server fallback**: refreshing `/about` returns a 404 from the server.
- **Reading `useRoute()` outside `setup`** (in a plain module) fails; outside components use `router.currentRoute.value`.
