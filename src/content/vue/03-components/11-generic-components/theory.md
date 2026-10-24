## Components that work with any data type

A list, a select, a table or an autocomplete should not care whether it shows users or products. In TypeScript you would write a **generic function**; since Vue 3.3, `<script setup>` components can be generic too.

```vue
<script setup lang="ts" generic="T extends { id: number }">
defineProps<{ items: T[]; selected?: T | null }>();
const emit = defineEmits<{ select: [item: T] }>();
</script>
```

The `generic` attribute accepts the same syntax as TypeScript type parameters, including constraints, defaults and several parameters (`generic="T, K extends keyof T"`).

## What it buys you

Without generics you would type `items` as `unknown[]` or `any[]`, and every consumer would lose type information:

```vue
<SelectList :items="users" @select="(user) => user.name" />
```

- With `any`, `user.name` compiles even if you misspell it.
- With `unknown`, you must cast in every handler.
- With `generic="T"`, Vue's type checker (vue-tsc / Volar) **infers** `T = User` from `:items`, so `user` in `@select` is a `User` and the scoped slot props are typed too.

## Typed scoped slots

Combine generics with `defineSlots` so the parent's slot content is checked:

```ts
defineSlots<{
  default(props: { item: T; selected: boolean }): any;
}>();
```

```vue
<SelectList :items="products">
  <template #default="{ item, selected }">
    {{ item.name }} — ${{ item.price }} <span v-if="selected">✓</span>
  </template>
</SelectList>
```

## Runtime vs type level

Generics are **erased** at runtime. The compiler still generates runtime prop declarations (`items: { type: Array }`), but anything typed only as `T` falls back to `null` (accept anything) at runtime. Validation of the shape of `T` only happens in your editor and in `vue-tsc`, not in the browser.

This lesson's playground compiles TypeScript without type checking, so the benefit you see here is the pattern itself; in a real project the editor and `vue-tsc --noEmit` enforce the types.

## Constraints are your contract

Constrain `T` to what the component actually needs. A select needs a stable key, so `T extends { id: number }` lets you write `:key="item.id"` safely, while still accepting any richer object.

```vue
<script setup lang="ts" generic="T extends { id: string | number }, K extends keyof T">
defineProps<{ rows: T[]; columns: K[] }>();
</script>
```

## Before Vue 3.3

Generic components required `defineComponent` with a function signature or wrapper factories, and most libraries simply typed props as `any`. Options API components cannot be generic.

## Pitfalls

- `generic` only works with `lang="ts"` and `<script setup>`.
- Type-only imports used in `generic` must be imported in the same `<script setup>` block.
- Keep the constraint minimal; over-constraining makes the component less reusable.
