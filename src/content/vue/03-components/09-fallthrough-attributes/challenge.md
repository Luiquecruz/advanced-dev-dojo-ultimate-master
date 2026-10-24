Build two base components that forward attributes correctly.

**`BaseButton.vue`**

1. Render a single root `<button class="btn">` with a default slot. Do not declare any props or emits: parent attributes such as `class`, `type` and `@click` must fall through to the button.

**`BaseInput.vue`**

2. Keep the declared `label: string` prop and the `defineModel` (declared props and models are **not** part of `$attrs`, so `v-model` keeps working).
3. Disable attribute inheritance with `defineOptions({ inheritAttrs: false })`.
4. Render a root `<label class="field">` containing `<span>` with the label and an `<input>` bound to the model that also receives **all** fallthrough attributes with `v-bind="$attrs"`.

**`App.vue`** (already uses both components, nothing to change) passes `type`, `placeholder`, `class` and listeners that the tests check.
