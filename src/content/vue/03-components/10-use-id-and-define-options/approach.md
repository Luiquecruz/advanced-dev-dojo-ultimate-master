1. Call `defineOptions` with the name and `inheritAttrs: false`.
2. Generate one id with `useId()` in setup.
3. Bind the id to the label's `for` and the input's `id`, and spread `$attrs` on the input.
4. Render the help `<small>` conditionally with a derived id and point `aria-describedby` at it.
5. Use the component twice in `App.vue`.
