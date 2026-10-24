Write the object with the same keys and string values and append `as const` so every value keeps its literal type.
---
`keyof typeof OrderStatus` gives `"Pending" | "Shipped" | "Delivered"`. Index the object type with it to get the values.
---
`type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];` A value and a type may share a name.
