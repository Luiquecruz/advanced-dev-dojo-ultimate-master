## Why a store?

Props and events work well between a parent and its children. When distant components share data (the signed-in user, a cart, a theme), passing it through every layer becomes painful. A **store** is a single reactive object that lives outside the component tree and that any component can read and change.

**Pinia** is the official state management library for Vue. It replaced Vuex as the recommendation in 2022 and is what `create-vue` scaffolds today.

## Installing Pinia

```ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

createApp(App).use(createPinia()).mount('#app');
```

## Defining an option store

`defineStore(id, options)` returns a `useXxxStore` function. The **id** must be unique: it is the key in devtools and in the pinia registry.

```ts
import { defineStore } from 'pinia';

export const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0, step: 1 }),
  getters: {
    double: (state) => state.count * 2,
    doublePlusStep(): number {
      return this.double + this.step;
    },
  },
  actions: {
    increment() {
      this.count += this.step;
    },
    async load() {
      const response = await fetch('/api/counter');
      this.count = (await response.json()).count;
    },
  },
});
```

The three options mirror the Options API:

| Option | Equivalent | Notes |
| --- | --- | --- |
| `state` | `data` | **Must be a function**, so every pinia instance (each SSR request, each test) gets fresh state. |
| `getters` | `computed` | Cached. Receive `state`; use a regular function with an explicit return type to read other getters via `this`. |
| `actions` | `methods` | Can be async. Use `this` to reach state, getters and other actions. |

## Using the store

```vue
<script setup lang="ts">
import { useCounterStore } from './stores/counter';

const counter = useCounterStore();
</script>

<template>
  <button @click="counter.increment()">{{ counter.count }} ({{ counter.double }})</button>
</template>
```

The store is a `reactive` object: read `counter.count`, not `counter.count.value`. The first call creates the store; later calls anywhere in the app return the **same instance**.

## Built-in store methods

- `$patch({ count: 5 })` or `$patch((state) => { state.items.push(x) })` applies several changes as one devtools entry.
- `$reset()` restores the initial state by calling your `state()` again. It exists **only for option stores**; setup stores must write their own reset action (next lesson).
- `$subscribe(callback)` and `$onAction(callback)` let you react to changes (covered in the plugins lesson).
- `$state` reads or replaces the whole state.

## Legacy vs modern

In **Vuex** you had `state`, `getters`, **mutations** (synchronous, the only way to change state) and **actions** (async, which `commit` mutations). Pinia removed mutations entirely: actions change state directly, and devtools still track every change. There are no namespaced modules either: each store is its own module, imported where needed.

Pinia 3 dropped Vue 2 and deprecated the `defineStore({ id: 'cart', ... })` object form; Pinia 4 is ESM-only and requires `@vue/devtools-api` v8 to be installed alongside it. Always pass the id as the first argument.

## Pitfalls

- **Arrow functions as actions** lose `this`. Use method syntax.
- **Calling `useStore()` at module top level** before `app.use(pinia)` throws "getActivePinia() was called but there was no active Pinia". Call it inside `setup`, actions or functions.
- **Destructuring the store** (`const { count } = useCounterStore()`) breaks reactivity. Use `storeToRefs` (lesson 3).
