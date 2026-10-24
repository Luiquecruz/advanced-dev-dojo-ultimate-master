Inside a computed getter, read refs with `.value`: `query.value`, `maxPrice.value`. Lowercase both the product name and the query before calling `includes`.
---
`total` can depend on another computed: `filtered.value.reduce((sum, product) => sum + product.price, 0)`.
---
A writable computed takes an object: `computed({ get: () => ..., set: (value: string) => { ... } })`. In the setter, `const [first, ...rest] = value.split(' ')` and assign `rest.join(' ')` to `lastName.value`.
