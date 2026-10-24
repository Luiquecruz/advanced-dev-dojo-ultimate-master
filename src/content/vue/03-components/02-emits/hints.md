`const emit = defineEmits<{ changeQuantity: [delta: number]; remove: [] }>()` gives you a typed emit function.
---
In the child template: `@click="emit('changeQuantity', 1)"`. In the parent: `@change-quantity="(delta) => changeQuantity(item.id, delta)"` so you know which item changed.
---
Clamp with `Math.max(1, item.quantity + delta)`, remove with `filter`, and compute the total with `reduce`.
