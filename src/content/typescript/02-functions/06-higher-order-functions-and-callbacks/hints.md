Each factory returns an arrow function. Because the return type is `PriceTransform`, the inner `price` parameter is typed automatically.
---
`pipeline` can fold the steps with `reduce`, starting from the incoming price: each step receives the result of the previous one.
---
Change the predicate type to `(price: number, index: number) => boolean`; callbacks that ignore `index` still fit. Count with `filter(...).length` or a loop.
