Build a small cart where each line item talks to its parent through events.

**`CartItem.vue`**

1. Props: `name: string` and `quantity: number`.
2. Declare two events with `defineEmits`: `changeQuantity` with a `delta: number` argument, and `remove` without arguments.
3. Render a root `<li class="cart-item">` containing `<span class="name">` (name), `<span class="quantity">` (quantity) and three buttons:
   - `aria-label="Decrease"` (text `−`) emits `changeQuantity` with `-1`,
   - `aria-label="Increase"` (text `+`) emits `changeQuantity` with `1`,
   - `aria-label="Remove"` (text `Remove`) emits `remove`.

**`App.vue`** (state already declared)

4. Render one `CartItem` per item, listening with `@change-quantity` and `@remove`.
5. `changeQuantity` adds the delta but never lets the quantity go below `1`.
6. `remove` deletes the item from the list.
7. Render `<p class="total">Total items: N</p>` where N is the sum of all quantities.
