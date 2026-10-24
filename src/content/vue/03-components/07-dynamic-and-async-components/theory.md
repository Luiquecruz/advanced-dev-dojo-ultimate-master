## Choosing a component at runtime

Tabs, wizards and dashboards often need to render "one of these components". The built-in `<component>` element renders whatever you pass to its `is` prop:

```vue
<script setup lang="ts">
import { shallowRef } from 'vue';
import HomeTab from './HomeTab.vue';
import ProfileTab from './ProfileTab.vue';

const current = shallowRef(HomeTab);
</script>

<template>
  <button @click="current = HomeTab">Home</button>
  <button @click="current = ProfileTab">Profile</button>
  <component :is="current" />
</template>
```

`is` accepts:

- an imported **component object** (the usual choice with `<script setup>`),
- the **name** of a globally registered component (`is="RouterLink"`),
- an **HTML tag name** (`:is="ordered ? 'ol' : 'ul'"`).

Props and listeners on `<component>` are forwarded to whatever is rendered.

### Pitfall: do not make components deeply reactive

Storing component definitions in `ref()` or `reactive()` makes Vue proxy the component object and logs a warning. Use `shallowRef`, a plain object map, or `markRaw`:

```ts
const tabs = { Home: HomeTab, Profile: ProfileTab };   // plain object, not reactive
const currentTab = ref<keyof typeof tabs>('Home');      // only the key is reactive
// <component :is="tabs[currentTab]" />
```

Switching `is` **unmounts** the previous component and destroys its state. Wrap it in `<KeepAlive>` to cache instances (covered in the built-ins module).

## Async components: load code on demand

Large components that are not needed right away (settings panels, charts, editors) can be split into separate chunks:

```ts
import { defineAsyncComponent } from 'vue';

const SettingsTab = defineAsyncComponent(() => import('./SettingsTab.vue'));
```

The bundler (Vite) turns the dynamic `import()` into a separate file that is downloaded the first time the component renders. Until then, Vue renders nothing (or a loading component). The result is a normal component you can use in templates or in `:is`.

### Options form

```ts
const Chart = defineAsyncComponent({
  loader: () => import('./Chart.vue'),
  loadingComponent: Spinner,    // shown while loading
  delay: 200,                   // ms before showing the spinner (avoids flashes)
  errorComponent: LoadError,    // shown when the loader rejects
  timeout: 5000,
});
```

Inside a `<Suspense>` boundary, async components are **suspensible** by default: the boundary's fallback is shown instead of `loadingComponent`.

Vue 3.5 also added lazy hydration strategies for SSR (`hydrate: hydrateOnVisible()`).

## Legacy notes

- Vue 2 accepted plain `() => import('./Comp.vue')` functions as async components. Vue 3 requires `defineAsyncComponent`, because plain functions are now **functional components**.
- `<component is="...">` on native elements to work around HTML parsing (e.g. inside `<table>`) now requires the `vue:` prefix: `<tr is="vue:my-row">`.
- With the Options API, components were registered in `components: { HomeTab }` and `is` usually received a string name.

## Router vs async components

Route-level code splitting (`component: () => import('./views/Settings.vue')` in Vue Router) is the most common lazy loading. Vue Router handles those loaders itself, so you do **not** wrap route components in `defineAsyncComponent`.
