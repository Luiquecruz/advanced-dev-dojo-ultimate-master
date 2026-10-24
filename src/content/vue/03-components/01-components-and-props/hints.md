`defineProps` is a macro: call it without importing it. Pass the props shape as a type argument: `defineProps<{ name: string; role?: string }>()`.
---
Defaults come from destructuring: `const { role = 'Member' } = defineProps<...>()`. The compiler keeps the destructured names reactive.
---
In `App.vue` use `v-for="user in users"` with `:key="user.id"` and bind every prop with a colon: `:name="user.name"`.
