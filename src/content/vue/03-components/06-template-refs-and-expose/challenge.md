Build a `SearchBox.vue` that a parent can control through a template ref.

**`SearchBox.vue`**

1. Render an `<input type="search" aria-label="Search">` bound with `v-model` to a `query` ref.
2. Get the input element with `useTemplateRef`.
3. Implement `focus()` (focuses the input) and `clear()` (empties `query` and focuses the input).
4. Expose both functions with `defineExpose`.

**`App.vue`**

5. Get the `SearchBox` instance with `useTemplateRef('search')`.
6. Render a button `Focus search` that calls `focus()` and a button `Clear` that calls `clear()` on the child.
