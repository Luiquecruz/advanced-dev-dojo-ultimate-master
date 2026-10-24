## Attributes you did not declare

When a parent passes an attribute or listener that the child does **not** declare as a prop or emit, Vue collects it in `$attrs` and, by default, adds it to the child's **root element**. This is attribute inheritance, or "fallthrough".

```vue
<!-- BaseButton.vue -->
<template>
  <button class="btn"><slot /></button>
</template>
```

```vue
<BaseButton class="primary" type="submit" @click="save" data-testid="save">Save</BaseButton>
<!-- renders -->
<button class="btn primary" type="submit" data-testid="save">Save</button>
```

- `class` and `style` are **merged** with the root's own values.
- Other attributes are added, overriding the root's value when they clash.
- `v-on` listeners become native listeners on the root (`@click="save"` works even though `BaseButton` never emits `click`).

This is why wrapper components "just work" with `id`, `aria-*`, `disabled` and so on.

## Turning it off: `inheritAttrs: false`

Often the root is not the right target. A labelled input wraps the `<input>` in a `<label>`, but `placeholder`, `type` and `@input` belong on the input:

```vue
<script setup lang="ts">
defineOptions({ inheritAttrs: false });
defineProps<{ label: string }>();
</script>

<template>
  <label class="field">
    <span>{{ label }}</span>
    <input v-bind="$attrs" />
  </label>
</template>
```

`defineOptions` (Vue 3.3+) sets component options from `<script setup>`. With `inheritAttrs: false`, nothing is added to the root automatically and you decide where `$attrs` goes with `v-bind="$attrs"`.

In script, use `useAttrs()`:

```ts
import { useAttrs } from 'vue';
const attrs = useAttrs();
```

`attrs` always reflects the latest values but is **not reactive**: you cannot `watch` it or use it in `computed`. If you need to react to a value, declare it as a prop.

## Multiple root nodes

Components with several root nodes (fragments) have no single place to put attributes. Vue warns unless you bind `$attrs` explicitly on one of them.

## What is not in `$attrs`

- Declared props and declared emits (that is one more reason to declare events: an undeclared `click` emit plus a fallthrough `@click` listener fires twice).
- Nothing else: unlike Vue 2, `class` and `style` **are** part of `$attrs`.

## Vue 2 differences

- Vue 2 had a separate `$listeners` object; Vue 3 merged listeners into `$attrs` (as `onClick`, `onInput`...).
- In Vue 2, `inheritAttrs: false` did not affect `class` and `style`; they were always applied to the root. In Vue 3 they follow `$attrs`.
- Vue 2 required the `.native` modifier to listen to native events on a component root; Vue 3 removed it because undeclared listeners fall through automatically.

## Options API comparison

```js
export default {
  inheritAttrs: false,
  props: ['label'],
  mounted() {
    console.log(this.$attrs);
  },
};
```
