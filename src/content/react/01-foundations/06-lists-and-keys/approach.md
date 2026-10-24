1. Derive `visible` during render: filter with `maxPrice === undefined || product.price <= maxPrice`.
2. Sort the filtered copy by price; `filter` returned a new array, so the prop stays untouched.
3. Add an early return for the empty case.
4. Map the visible products to `<li>` elements keyed by `product.id`, with the text `{product.name}: ${product.price}`.
