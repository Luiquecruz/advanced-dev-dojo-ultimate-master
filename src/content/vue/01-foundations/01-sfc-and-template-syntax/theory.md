## Single File Components

A `.vue` file groups the three concerns of a component:

```vue
<script setup lang="ts">
import { ref } from 'vue';
const count = ref(0);
</script>

<template>
  <button @click="count++">Clicked {{ count }} times</button>
</template>

<style scoped>
button { font-weight: 600; }
</style>
```

- `<script setup>` is compiled into the component's `setup()` function. Every top-level binding is available in the template.
- `<template>` is compiled into a render function at build time.
- `<style scoped>` adds a unique `data-v-*` attribute so the CSS only applies to this component.

## Interpolation and directives

- `{{ expression }}` renders text (HTML is escaped).
- `v-bind:attr` / `:attr` binds an attribute to an expression.
- `v-on:event` / `@event` listens to DOM events.
- `ref()` creates reactive state. Inside `<script>` you read/write `.value`; the template unwraps it automatically.
