## Lazy-loading route components

By default every component imported in `router.ts` lands in the main JavaScript bundle, even pages most users never open. Replace the static import with a function that returns a dynamic `import()`:

```ts
// ❌ eager: AdminView ships to every visitor
import AdminView from './views/AdminView.vue';
{ path: '/admin', component: AdminView }

// ✅ lazy: Vite emits a separate chunk, fetched on first visit
{ path: '/admin', component: () => import('./views/AdminView.vue') }
```

The router calls the function the first time the route is resolved, waits for the chunk (before `beforeResolve` and `afterEach`) and caches the result. Things to know:

- Use it for routes, **not** `defineAsyncComponent`. Route components are already awaited by the router; wrapping them in `defineAsyncComponent` is unnecessary and produces warnings.
- Group related pages by letting the bundler split naturally, or with Vite's `build.rollupOptions.output.manualChunks`. The old webpack magic comment `/* webpackChunkName: "admin" */` has no effect in Vite.
- A slow network makes the navigation wait. Show a progress indicator from `beforeEach` / `afterEach`, or keep the landing pages eager.
- After a deploy, an old tab may request a chunk that no longer exists. Handle `router.onError` (for example by reloading the page when a dynamic import fails).

## File-based routing in Vue Router 5

Writing route tables by hand is repetitive. Vue Router 5 absorbed **unplugin-vue-router**, so the official package now generates routes from your `src/pages` folder at build time:

```ts
// vite.config.ts
import VueRouter from 'vue-router/vite';
import Vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [VueRouter(), Vue()], // VueRouter() must come before Vue()
});
```

```ts
// main.ts
import { createRouter, createWebHistory } from 'vue-router';
import { routes, handleHotUpdate } from 'vue-router/auto-routes';

const router = createRouter({ history: createWebHistory(), routes });
if (import.meta.hot) handleHotUpdate(router);
```

### Conventions

| File | Route |
| --- | --- |
| `pages/index.vue` | `/` |
| `pages/about.vue` | `/about` |
| `pages/users/[id].vue` | `/users/:id` |
| `pages/users/[[id]].vue` | `/users/:id?` (optional) |
| `pages/articles/[slugs]+.vue` | `/articles/:slugs+` (repeatable) |
| `pages/[...path].vue` | catch-all (404) |
| `pages/users.vue` + `pages/users/` | `users.vue` is the parent layout (needs `<RouterView />`) |
| `pages/users/_parent.vue` | alternative place for that parent layout |
| `pages/(admin)/dashboard.vue` | `/dashboard`: route groups do not appear in the URL |
| `pages/index@aux.vue` | named view `aux` for `/` |

Generated routes are lazy-loaded by default and get names derived from their path (`/users/[id]`). The plugin also writes a `typed-router.d.ts` (or `route-map.d.ts`) file, so `router.push({ name: '/users/[id]', params: { id: '1' } })` and `useRoute('/users/[id]').params.id` are fully type-checked.

### Route metadata with `definePage`

```vue
<script setup lang="ts">
definePage({
  name: 'user-profile',
  meta: { requiresAuth: true },
  alias: ['/u/:id'],
});
</script>
```

`definePage` is a compiler macro, like `defineProps`: it is extracted at build time and removed from the component. A `<route>` custom block (JSON/YAML) is an alternative.

### Data loaders (experimental)

Vue Router 5 also ships experimental **data loaders** from `vue-router/experimental`. A page exports a loader that runs during navigation, so data is ready when the page renders:

```ts
export const useUserData = defineBasicLoader('/users/[id]', (route) => getUser(route.params.id));
// in setup:
const { data: user, isLoading, error, reload } = useUserData();
```

They require `app.use(DataLoaderPlugin, { router })` before `app.use(router)`. The Pinia Colada variant lives in `vue-router/experimental/pinia-colada`.

## Migrating from unplugin-vue-router

Remove the `unplugin-vue-router` dependency, change imports from `unplugin-vue-router/vite` to `vue-router/vite`, data loaders to `vue-router/experimental`, Volar plugins to `vue-router/volar/*`, and drop the old `unplugin-vue-router/client` types reference. Projects without file-based routing upgrade from v4 with no code changes. Vue Router 6 will be ESM-only and remove deprecated APIs such as the `next()` guard callback.

## When to choose which

Hand-written route tables remain fully supported and are fine for small apps or libraries. File-based routing shines in medium and large apps (and is what Nuxt does): less boilerplate, lazy loading for free and typed route names.
