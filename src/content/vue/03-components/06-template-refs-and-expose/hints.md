Add `ref="input"` to the `<input>` and read it with `const input = useTemplateRef<HTMLInputElement>('input')`.
---
`defineExpose({ focus, clear })` makes the functions visible to a parent's template ref. Without it, `<script setup>` components are closed.
---
In `App.vue`: `<SearchBox ref="search" />` plus `const search = useTemplateRef('search')`, then `@click="search?.focus()"`.
