Convert `RatingInput.vue` from runtime array declarations to **type-based** props and emits.

1. Declare props with `defineProps<Props>()`, where `Props` is an interface **in the same file** with `modelValue: number`, `label: string` and an optional `max?: number`. Default `max` to `5` (use reactive props destructure or `withDefaults`).
2. Declare emits with the tuple syntax `defineEmits<{ ... }>()`:
   - `'update:modelValue'` with `[value: number]`,
   - `change` with `[value: number, previous: number]`.
3. Clicking a star emits `update:modelValue` with the clicked value and then `change` with the clicked value and the previous `modelValue`.
4. Keep the template behavior: a `<legend>` with the label, `max` buttons labelled `Rate N of MAX`, and `aria-pressed="true"` for every button up to `modelValue`.

`App.vue` already uses `<RatingInput v-model="rating" />`.
