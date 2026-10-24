1. Declare both events in `CartItem.vue` and wire each button to the right `emit` call.
2. In `App.vue`, render the list with `v-for` and pass `name` and `quantity` down.
3. Listen to `change-quantity` with an inline arrow so you can forward both the item id and the delta.
4. Implement `changeQuantity` (find, add, clamp) and `remove` (filter).
5. Derive the total with `computed` and render it.
