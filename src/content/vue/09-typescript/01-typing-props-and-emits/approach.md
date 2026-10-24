1. Add an `interface Props` with the three properties, making `max` optional.
2. Replace the runtime `defineProps([...])` with a destructured `defineProps<Props>()` that defaults `max` to `5`.
3. Replace `defineEmits([...])` with the typed tuple form for both events.
4. In `select`, emit both events and update the template to use the destructured names.
