## Why special handling for `class` and `style`

`class` and `style` are attributes, so `:class="someString"` works. But building class strings by concatenation is error prone (`'tab ' + (active ? 'active' : '')`). Vue gives `:class` and `:style` extra powers: they accept **objects and arrays**, and they **merge** with the static attribute on the same element.

## Object syntax for classes

Each key is a class name, each value decides whether it is applied:

```vue
<script setup lang="ts">
import { ref } from 'vue';
const isActive = ref(true);
const hasError = ref(false);
</script>

<template>
  <div class="tab" :class="{ active: isActive, 'text-danger': hasError }"></div>
  <!-- renders: <div class="tab active"></div> -->
</template>
```

- Class names with dashes must be quoted (`'text-danger'`).
- The static `class="tab"` is kept and merged with the bound classes.
- The object can come from a computed property, which keeps templates clean:

```ts
const classes = computed(() => ({
  active: isActive.value && !hasError.value,
  'text-danger': hasError.value,
}));
```

## Array syntax

An array lists classes to apply. Elements can be strings, expressions or objects:

```vue
<div :class="[`alert-${level}`, { dismissible: canDismiss }]"></div>
<!-- level = 'warning', canDismiss = true -> class="alert-warning dismissible" -->
```

Falsy entries (`''`, `null`, `undefined`, `false`) are ignored, so `[isActive ? 'active' : '', size]` also works, but the object form inside the array reads better.

## Style bindings

`:style` accepts an object of CSS properties. Use camelCase keys (or quoted kebab-case) and remember to include units:

```vue
<div :style="{ width: progress + '%', backgroundColor: color, 'font-size': size + 'px' }"></div>
```

- Bind an array of objects to merge several style objects: `:style="[baseStyles, overrides]"`.
- Vue automatically adds vendor prefixes when a property needs one in the current browser.
- A property can receive an array of values; the browser uses the last one it supports: `{ display: ['-webkit-box', 'flex'] }`.
- `null` / `undefined` values are skipped, which is handy for optional styles.

Prefer classes for anything static or themeable; use `:style` for values that are truly dynamic (sizes computed at runtime, user-picked colors, CSS custom properties like `{ '--accent': color }`).

## Classes on components

When you put `class` on a component with a single root element, the classes are added to that root (fallthrough attributes). With multiple roots, the component decides where they go with `$attrs.class`. This is covered in the Components module.

## Scoped styles and dynamic classes

`<style scoped>` rewrites selectors with a `data-v-*` attribute. Dynamic classes work normally with scoped styles because the attribute is on every element the component renders:

```vue
<style scoped>
.tab.active { border-bottom: 2px solid #42b883; }
</style>
```

## Pitfalls

- `:style="{ width: progress }"` without a unit is ignored by the browser for most properties. Write `progress + '%'`.
- Writing `class` twice (`class="a" class="b"`) is invalid HTML; combine a static `class` with **one** `:class`.
- `:class="isActive && 'active'"` is fine, but `false` / `0` must never be a valid class name.

## Vue 2 note

The syntax is identical in Vue 2 and the Options API. The one change in Vue 3 is that a component's `class` and `style` are now part of `$attrs`, so `inheritAttrs: false` also stops them from falling through.
