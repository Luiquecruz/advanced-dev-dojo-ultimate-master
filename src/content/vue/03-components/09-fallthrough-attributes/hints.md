`BaseButton` needs no script at all: a single root element receives undeclared attributes automatically, with `class` merged.
---
In `BaseInput.vue`, call `defineOptions({ inheritAttrs: false })` so nothing lands on the `<label>`.
---
Add `v-bind="$attrs"` to the `<input>` next to its `v-model`. `label` and the model are declared, so they are not in `$attrs`; `type`, `placeholder` and `class` are.
