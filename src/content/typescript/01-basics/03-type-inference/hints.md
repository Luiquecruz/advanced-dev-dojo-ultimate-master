`reduce(callback, initialValue)` calls the callback with the accumulator first and the current item second. The initial value decides the accumulator type.
---
Because `items` is a `CartItem[]`, the callback `(total, item) => ...` already knows that `item` is a `CartItem` and `total` is a `number`.
---
For the empty array, put the type on the variable: `const discountCodes: string[] = [];`.
