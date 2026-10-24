## Components are functions of their props

A component is a reusable piece of UI with its own template, logic and styles. The parent passes data **down** through **props**; the child never mutates them.

```vue
<!-- App.vue -->
<script setup lang="ts">
import UserCard from './UserCard.vue';
</script>

<template>
  <UserCard name="Ada Lovelace" role="Admin" :online="true" />
</template>
```

With `<script setup>`, importing a component is enough to use it in the template. No `components: {}` registration is needed.

## Declaring props with `defineProps`

`defineProps` is a **compiler macro**: it is not imported and only works at the top level of `<script setup>`. There are two syntaxes:

```ts
// runtime declaration (works in plain JavaScript)
const props = defineProps({
  name: { type: String, required: true },
  role: { type: String, default: 'Member' },
});

// type-based declaration (TypeScript)
const props = defineProps<{ name: string; role?: string }>();
```

With the type-based form the compiler generates the runtime declaration for you: `name` becomes required, `role` optional.

## Default values: reactive props destructure (Vue 3.5)

Since Vue 3.5 you can destructure props and give defaults with plain JavaScript syntax:

```ts
const { name, role = 'Member', online = false } = defineProps<{
  name: string;
  role?: string;
  online?: boolean;
}>();
```

This looks like it breaks reactivity, but it does not: the compiler rewrites every access of `role` into `props.role`, so the template and `computed(() => role.toUpperCase())` stay reactive. Before 3.5 you needed `withDefaults`:

```ts
const props = withDefaults(defineProps<{ role?: string }>(), { role: 'Member' });
```

### Pitfall: passing a destructured prop to a function

`watch(role, ...)` or `useSomething(role)` receives a **plain value** captured once. Wrap it in a getter instead: `watch(() => role, ...)`. The compiler warns you when you get this wrong.

## Passing props from the parent

- Static strings: `role="Admin"`.
- Anything else needs `v-bind`: `:online="true"`, `:age="36"`, `:user="user"`. Without the colon you pass the **string** `"true"`.
- Boolean props have a shortcut: `<UserCard online />` means `online: true`; omitting it means `false` (boolean casting).
- Props are declared in camelCase (`avatarUrl`) and can be written in kebab-case in templates (`avatar-url="..."`).

## One-way data flow

Props flow down. Writing to a prop (`props.role = 'x'`) logs a warning and is overwritten on the next parent render. If a child needs to change data, it **emits an event** (next lesson) or keeps a local copy:

```ts
const { initial } = defineProps<{ initial: number }>();
const count = ref(initial);   // local state seeded from a prop
```

## Options API comparison

```js
export default {
  props: {
    name: { type: String, required: true },
    role: { type: String, default: 'Member' },
  },
  computed: {
    label() { return `${this.name} (${this.role})`; },
  },
};
```

The Options API reads props through `this`. `<script setup>` gives you plain variables with full TypeScript inference.
