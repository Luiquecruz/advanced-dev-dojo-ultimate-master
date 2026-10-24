`clsx` accepts strings and objects: `clsx('btn', { 'btn-block': fullWidth })` only keeps `btn-block` when `fullWidth` is truthy.
---
Template strings build the variant classes: `` `btn-${variant}` ``. Pass `className` as the last argument so callers can extend the button, and spread `{...rest}` onto the `<button>`.
---
For the bar, compute `const clamped = Math.min(100, Math.max(0, value))`, then set `` style={{ width: `${clamped}%` }} `` on the fill and `aria-valuenow={clamped}` on the outer div.
