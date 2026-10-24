## Accessible forms need ids

Associating a `<label>` with its input (`for` / `id`), or a hint with `aria-describedby`, requires **unique ids**. A reusable `FormField` component cannot hardcode them: rendering it twice would duplicate ids and break the association for screen readers and `getByLabelText`.

Common workarounds were a module-level counter (`let id = 0; id++`) or `Math.random()`. Both break with **server-side rendering**: the server and the browser generate different values, which causes hydration mismatches.

## `useId()` (Vue 3.5)

```vue
<script setup lang="ts">
import { useId } from 'vue';

const id = useId();
</script>

<template>
  <label :for="id">Email</label>
  <input :id="id" type="email" />
</template>
```

`useId()` returns a string unique **per application** that is stable between server and client renders. Rules:

- Call it in `setup` (or a composable called from it), never inside `computed` or render logic, so every instance gets exactly one id.
- Derive related ids from it: `${id}-help`, `${id}-error`.
- When several Vue apps live on one page, configure `app.config.idPrefix` to keep them apart.

## `defineOptions` (Vue 3.3)

Some component options have no dedicated macro. Before 3.3 you needed a second, normal `<script>` block next to `<script setup>`:

```vue
<script lang="ts">
export default { name: 'FormField', inheritAttrs: false };
</script>

<script setup lang="ts">
// ...
</script>
```

`defineOptions` does the same in one block:

```ts
defineOptions({
  name: 'FormField',
  inheritAttrs: false,
});
```

Useful options:

- `name`: shown in Vue DevTools and warnings, required for **recursive components** referencing themselves, and matched by `<KeepAlive include="FormField">`. (Single File Components infer a name from the file name, but an explicit name survives renames and bundling.)
- `inheritAttrs`: control fallthrough attributes.

`defineOptions` cannot declare `props`, `emits`, `expose` or `slots`: use their dedicated macros. Like every macro, it is hoisted out of `setup`, so it cannot reference local variables.

## Putting it together

```vue
<script setup lang="ts">
import { useId } from 'vue';

defineOptions({ name: 'FormField', inheritAttrs: false });
const { label, help } = defineProps<{ label: string; help?: string }>();
const id = useId();
</script>

<template>
  <div class="form-field">
    <label :for="id">{{ label }}</label>
    <input :id="id" v-bind="$attrs" :aria-describedby="help ? `${id}-help` : undefined" />
    <small v-if="help" :id="`${id}-help`">{{ help }}</small>
  </div>
</template>
```

Binding an attribute to `undefined` removes it, so fields without help text get no dangling `aria-describedby`.

## Options API comparison

```js
let uid = 0;
export default {
  name: 'FormField',
  inheritAttrs: false,
  data: () => ({ id: `field-${uid++}` }),   // not SSR safe
};
```
