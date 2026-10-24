1. Add `:id` (no value) to the `<section>`, since the constant is also called `id`.
2. Bind the image attributes with `:src` and `:alt`, pointing them at the refs.
3. Bind `:disabled` on the Save button to `isBusy`; the Finish button already flips it.
4. Use `v-bind` without an argument to spread every key of `link` onto the `<a>`.
