Build a quantity picker with two-way binding.

**`quantity-picker.ts` — `QuantityPicker`** (selector `app-quantity-picker`):

1. Declare `value` with `model()` and a default of `1`. Inputs `min` (default `1`) and `max` (default `10`) already exist.
2. Render the current value inside `<span class="value">`.
3. A button with `aria-label="Decrease"` decrements the value; a button with `aria-label="Increase"` increments it. Implement `decrease()` and `increase()` with `value.update(...)`, never going below `min()` or above `max()`.
4. Disable **Decrease** when the value equals `min()` and **Increase** when it equals `max()`.

**`app.ts` — `App`**:

5. Bind the picker to the `quantity` signal with two-way binding: `[(value)]="quantity"`.

The parent already shows `Total: $<quantity × 15>` and has a **Reset** button that sets `quantity` to `1`.
