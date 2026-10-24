Type-based props: `const { modelValue, label, max = 5 } = defineProps<Props>()`. Since Vue 3.5, destructured props stay reactive and the `= 5` becomes the default.
---
Tuple syntax names each argument: `defineEmits<{ change: [value: number, previous: number] }>()`. Quote names containing `:`: `'update:modelValue'`.
---
Read the old value *before* the parent updates it: `emit('update:modelValue', value); emit('change', value, modelValue);` works because the prop only changes after the parent re-renders.
