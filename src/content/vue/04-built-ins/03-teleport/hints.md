Wrap everything in `<Teleport to="body">` and put `v-if="open"` on the backdrop inside it.
---
`const emit = defineEmits<{ close: [] }>()`. Wire it with `@click="emit('close')"` on the button and `@keydown.esc="emit('close')"` on the dialog.
---
`@click.self="emit('close')"` on the backdrop ignores clicks that start inside the dialog.
