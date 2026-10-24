Required inputs: `readonly label = input.required<string>();`. Optional ones take a default: `readonly currency = input('USD');`.
---
Transforms go in the options object: `input(0, { transform: numberAttribute })` and `input(false, { transform: booleanAttribute })`.
---
`finalPrice = computed(() => this.amount() * (1 - this.discount() / 100))`. In the template use `finalPrice().toFixed(2)`, wrap the `<s class="original">` in `@if (discount() > 0)`, and add `host: { '[class.highlighted]': 'highlighted()' }` to the decorator.
