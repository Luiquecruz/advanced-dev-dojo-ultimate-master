The type parameter goes on the script tag: `<script setup lang="ts" generic="T extends { id: number }">`. After that, `T` can be used in `defineProps`, `defineEmits` and `defineSlots`.
---
`defineSlots<{ default(props: { item: T; selected: boolean }): any }>()` only adds types; the slot itself is still a `<slot>` in the template.
---
Inside the `v-for`, compute the selection once per row: `selected?.id === item.id`. Bind it to `aria-selected` and pass it to `<slot :item="item" :selected="...">{{ item.id }}</slot>`.
