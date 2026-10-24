## Props pass data, slots pass template

Props are perfect for values, but sometimes the parent needs to pass **markup**: a button label with an icon, a card body, a custom row. Slots let a component render content that the parent supplies.

```vue
<!-- FancyButton.vue -->
<template>
  <button class="fancy"><slot>Submit</slot></button>
</template>
```

```vue
<FancyButton>Save <strong>now</strong></FancyButton>
<FancyButton />  <!-- renders the fallback "Submit" -->
```

Content placed between `<slot>` tags is the **fallback**, rendered when the parent passes nothing.

Slot content is compiled in the **parent's scope**: it can read the parent's state, not the child's.

## Named slots

A component can expose several outlets by naming them:

```vue
<!-- Card.vue -->
<template>
  <article class="card">
    <header><slot name="header">Untitled</slot></header>
    <div class="body"><slot /></div>
    <footer v-if="$slots.footer"><slot name="footer" /></footer>
  </article>
</template>
```

The parent targets them with `<template #name>` (short for `v-slot:name`). Anything outside a named template goes to the default slot:

```vue
<Card>
  <template #header>Profile</template>
  Body text goes to the default slot.
  <template #footer><button>Close</button></template>
</Card>
```

`$slots.footer` (or `useSlots()` in script) tells you whether the parent provided a slot, which is handy to avoid rendering empty wrappers.

## Scoped slots: the child passes data back

A child can pass data **to** the slot content by binding attributes on `<slot>`. The parent receives them as slot props:

```vue
<!-- ItemList.vue -->
<template>
  <ul>
    <li v-for="(item, index) in items" :key="item.id">
      <slot name="item" :item="item" :index="index">{{ item.name }}</slot>
    </li>
  </ul>
</template>
```

```vue
<ItemList :items="products">
  <template #item="{ item, index }">
    {{ index + 1 }}. {{ item.name }} — ${{ item.price }}
  </template>
</ItemList>
```

The list owns the iteration and markup structure; the parent decides how each row looks. This is the foundation of **renderless** and headless components (tables, virtual lists, comboboxes).

## Typing slots

With TypeScript you can declare slots with `defineSlots` for autocompletion in the parent:

```ts
defineSlots<{
  default(): any;
  item(props: { item: Product; index: number }): any;
}>();
```

## Pitfalls

- Mixing a default-slot `v-slot` on the component tag with named `<template #x>` blocks is a compile error. Use `<template #default>` when you have named slots.
- Slot props are read-only. To change data, emit an event or call a function passed as a slot prop.
- `$slots.footer` is checked at render time; it is not reactive state you should copy into a ref.

## Legacy syntax

Vue 2.5 used `slot="header"` and `slot-scope="props"` attributes. Vue 2.6 introduced `v-slot`, and Vue 3 removed the old attributes. In Vue 2 scoped slots lived in `this.$scopedSlots`; in Vue 3 everything is unified in `$slots`, and each slot is a function.
