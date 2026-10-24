Declare `customer` as an inline object type that uses `ShippingAddress` for its `address`.
---
Use `reduce` with an initial value of `0` to compute the total.
---
For countries: `map` to `order.customer.address.country`, deduplicate with `new Set`, spread back into an array and `sort()`.
