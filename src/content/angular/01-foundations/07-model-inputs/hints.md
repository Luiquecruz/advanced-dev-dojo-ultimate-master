`readonly value = model(1);` creates both the `value` input and the `valueChange` output. Inside the child it's writable.
---
Clamp while updating: `this.value.update(v => Math.min(this.max(), v + 1))`. Disable with `[disabled]="value() >= max()"`.
---
In the parent pass the signal itself, without calling it: `<app-quantity-picker [(value)]="quantity" />`.
