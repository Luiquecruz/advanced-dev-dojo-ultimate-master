Never write to an argument. Build new objects with spread (`{ ...cart, items }`) and new arrays with `map`, `filter` or `[...items, item]`.
---
`addItem`: check `cart.items.some((current) => current.sku === item.sku)`. If it exists, `map` the items and replace the matching one with `{ ...current, quantity: current.quantity + item.quantity }`; otherwise append.
---
`pipe` is one `reduce`: `(value) => fns.reduce((acc, fn) => fn(acc), value)`. Rules are closures: `percentOff(percent)` returns `(summary) => ({ ...summary, discount: summary.discount + Math.round(summary.subtotal * percent / 100) })`.
---
`priceCart`: `const priced = pipe(...rules)({ subtotal: subtotal(cart), discount: 0, shipping, total: 0 })`, then return `{ ...priced, total: Math.max(0, priced.subtotal - priced.discount) + priced.shipping }`.
