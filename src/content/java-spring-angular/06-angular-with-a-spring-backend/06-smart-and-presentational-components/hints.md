Signal inputs are class fields: `readonly product = input.required<Product>();`. Read them as functions in the template: `product().name`. The output is `readonly add = output<Product>();` and the template emits with `add.emit(product())`.
---
`selected` is `input(false)`, and the class binding is `[class.selected]="selected()"`. Import `CurrencyPipe` (already in `imports`) for `| currency`.
---
The container owns the state: `httpResource<Product[]>(() => '/api/products', { defaultValue: [] })`, `signal<Product[]>([])` for the cart and a `computed` for the total.
---
`addToCart` should return early when `isInCart(product.id)` is true, then call `this.cart.update((items) => [...items, product])`. Never mutate the array in place.
