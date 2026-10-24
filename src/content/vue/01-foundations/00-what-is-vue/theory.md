## Vue in one sentence

Vue is a **progressive** JavaScript framework for building user interfaces. It combines a declarative, HTML-based template syntax with a fine-grained **reactivity system**: you describe what the UI should look like for a given state, and Vue updates the DOM when that state changes.

```vue
<script setup lang="ts">
import { ref } from 'vue';
const count = ref(0);
</script>

<template>
  <button @click="count++">Count is {{ count }}</button>
</template>
```

Vue was created by Evan You and first released in 2014. Vue 3 (2020) rewrote the core in TypeScript, introduced the Composition API and replaced the Vue 2 reactivity engine with JavaScript Proxies. Vue 2 reached **end of life on December 31, 2023**.

## "Progressive" framework

You can adopt as much of Vue as you need:

1. **Enhance static HTML** with a script tag from a CDN (no build step), like a modern jQuery replacement.
2. **Embed widgets** or web components inside an existing server-rendered app.
3. **Single-page applications** with Vue Router and Pinia.
4. **Full-stack / SSR / static sites** with Nuxt, or VitePress for documentation.
5. **Desktop and mobile** through Electron, Tauri, Capacitor or Quasar.

## Single File Components

Most Vue apps use **SFCs**: `.vue` files that hold a component's logic, template and styles together.

```vue
<script setup lang="ts">/* logic */</script>
<template><!-- markup --></template>
<style scoped>/* CSS for this component only */</style>
```

A build tool compiles each SFC into a plain JavaScript module: the template becomes an optimized render function, scoped CSS gets unique attribute selectors, and TypeScript is stripped.

## Two API styles

| | Options API | Composition API |
| --- | --- | --- |
| Shape | an object with `data`, `methods`, `computed`, `watch` | functions (`ref`, `computed`, `watch`) called in `setup` / `<script setup>` |
| Logic grouping | by option type | by feature |
| Reuse | mixins (fragile) | composables (plain functions) |
| TypeScript | workable | excellent inference |

Both are fully supported in Vue 3, and the Options API is built on top of the Composition API. New projects and this course use **`<script setup>` + Composition API**; the legacy module covers the Options API.

## Tooling

- **Vite** (also created by Evan You) is the standard dev server and bundler: instant start, hot module replacement that keeps component state.
- **create-vue** scaffolds a project: `npm create vue@latest` asks about TypeScript, JSX, Vue Router, Pinia, Vitest, Playwright and ESLint. (The old Vue CLI, based on webpack, is in maintenance mode.)
- **Vue DevTools** (browser extension and Vite plugin) inspects components, state, Pinia stores and routes.
- **Vue - Official** (formerly Volar) is the VS Code extension; `vue-tsc` type checks `.vue` files in CI.

```bash
npm create vue@latest my-app
cd my-app && npm install && npm run dev
```

## Ecosystem

Official libraries: **Vue Router** (routing), **Pinia** (state management, the successor of Vuex), **Vue Test Utils**. Community favorites: **Nuxt** (full-stack framework), **VueUse** (composables), **TanStack Query**, **VeeValidate**, component libraries such as Vuetify, PrimeVue and Quasar.

## Where Vue is heading

Vue 3.5 brought a faster, lighter reactivity system, reactive props destructure and `useTemplateRef`. Vue 3.6 (in release-candidate stage as of late 2026) adds **Vapor Mode**, an opt-in compilation mode for SFCs that skips the virtual DOM and updates the DOM directly from reactive effects, and rebuilds `@vue/reactivity` on top of the `alien-signals` algorithm. Your component code stays the same: these are compiler and runtime improvements, which is the benefit of a template-driven framework.
