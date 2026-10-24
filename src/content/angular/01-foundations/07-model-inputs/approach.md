1. Declare `value = model(1)` in `QuantityPicker`.
2. Write the template: Decrease button, `<span class="value">{{ value() }}</span>`, Increase button, each with `(click)` and a `[disabled]` binding comparing `value()` to `min()`/`max()`.
3. Implement `decrease()`/`increase()` with `update` plus `Math.max`/`Math.min` clamping.
4. In `App`, add `[(value)]="quantity"` so writes in the child flow up and the Reset button flows down.
