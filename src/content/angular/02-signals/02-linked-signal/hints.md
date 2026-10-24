Short form: `readonly quantity = linkedSignal(() => this.product().minQuantity);`. It's writable, so `addOne()` can call `this.quantity.update(q => q + 1)`.
---
Long form: `linkedSignal<string[], string>({ source: () => this.product().sizes, computation: (sizes, previous) => ... })`.
---
`previous` is `undefined` the first time, then `{ source, value }`. Return `previous && sizes.includes(previous.value) ? previous.value : sizes[0]`.
