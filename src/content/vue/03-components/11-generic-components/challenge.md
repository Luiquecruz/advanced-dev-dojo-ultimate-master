Build a reusable generic `SelectList.vue` and use it with two different data types.

**`SelectList.vue`**

1. Use `<script setup lang="ts" generic="T extends { id: number }">`.
2. Props: `items: T[]` and `selected?: T | null`.
3. Emits: `select` with the clicked `item: T`.
4. Type the default slot with `defineSlots`: it receives `{ item: T; selected: boolean }`.
5. Render `<ul role="listbox">` with one `<li role="option">` per item (keyed by `id`). Each option has `aria-selected` (`true` when `selected?.id === item.id`), emits `select` on click and renders the default slot, falling back to the item id.

**`App.vue`** (already written) renders a list of users and a list of products with custom slot content and shows `Selected user: ...` / `Selected product: ...`.
