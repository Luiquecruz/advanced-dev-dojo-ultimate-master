## Reaching the DOM

Vue updates the DOM for you, but sometimes you need the actual element: to focus an input, measure a size, or hand a node to a third-party library. A **template ref** gives you that access.

## The modern way: `useTemplateRef` (Vue 3.5)

```vue
<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue';

const input = useTemplateRef<HTMLInputElement>('search');

onMounted(() => input.value?.focus());
</script>

<template>
  <input ref="search" />
</template>
```

The string passed to `useTemplateRef` matches the `ref` attribute. The ref is `null` until the element is mounted, and back to `null` after it unmounts, so always access it in `onMounted`, event handlers or watchers, and use optional chaining.

## The previous way: a ref with the same name

Before 3.5 you declared a plain ref whose **variable name** matched the attribute:

```ts
const search = ref<HTMLInputElement | null>(null);
// <input ref="search" />
```

It still works, but the link is implicit (renaming the variable silently breaks it) and it does not work when the ref name is dynamic. `useTemplateRef` makes the connection explicit.

## Refs inside `v-for`

A ref inside `v-for` collects an **array** of elements: `useTemplateRef<HTMLLIElement[]>('items')`. The array order is not guaranteed to match the source array.

## Component refs and `defineExpose`

A ref on a **child component** gives you its public instance. Components using `<script setup>` are **closed by default**: the parent sees nothing until the child opts in with `defineExpose`:

```vue
<!-- SearchBox.vue -->
<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';

const query = ref('');
const input = useTemplateRef<HTMLInputElement>('input');

function focus() { input.value?.focus(); }
function clear() { query.value = ''; focus(); }

defineExpose({ focus, clear });
</script>
```

```vue
<!-- Parent -->
<script setup lang="ts">
import { useTemplateRef } from 'vue';
import SearchBox from './SearchBox.vue';

const search = useTemplateRef<InstanceType<typeof SearchBox>>('search');
</script>

<template>
  <SearchBox ref="search" />
  <button @click="search?.focus()">Focus</button>
</template>
```

Expose a small, intentional API (methods like `focus`, `reset`, `validate`), not internal state. For data, props and events remain the right tools.

## Pitfalls

- Accessing a template ref during `setup` returns `null`: the DOM does not exist yet.
- An element hidden with `v-if` sets its ref back to `null`.
- Calling `this.$refs.child.someMethod()` on a `<script setup>` child without `defineExpose` fails: the method is `undefined`.

## Options API comparison

```js
export default {
  mounted() {
    this.$refs.search.focus();
  },
  methods: {
    focus() { this.$refs.search.focus(); },
  },
  expose: ['focus'],
};
```

Options API components are **open** by default (`$refs.child` exposes everything) unless they declare `expose`.
