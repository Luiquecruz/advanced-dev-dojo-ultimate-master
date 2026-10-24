Build an accessible `FormField.vue` and render two of them.

**`FormField.vue`**

1. Use `defineOptions` to set `name: 'FormField'` and `inheritAttrs: false`.
2. Props: `label: string` and optional `help?: string`.
3. Generate an id with `useId()`.
4. Render `<div class="form-field">` with:
   - `<label>` whose `for` is the id and whose text is the label,
   - `<input>` with that `id`, all fallthrough attributes (`v-bind="$attrs"`) and `aria-describedby="<id>-help"` **only when** `help` is provided,
   - `<small>` with id `<id>-help` and the help text, only when `help` is provided.

**`App.vue`**

5. Render a `FormField` with label `Email`, `type="email"` and help `We never share it`, and a second one with label `Password` and `type="password"` (no help).
