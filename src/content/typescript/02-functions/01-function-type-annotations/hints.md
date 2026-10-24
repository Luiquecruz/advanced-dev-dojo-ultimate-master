Prices and percentages are `number`, the currency code is a `string`. Put the return type after the closing parenthesis: `(...): number`.
---
For an arrow function the return type goes before the arrow: `(amount: number, currency: string): string => ...`. `toFixed(2)` formats two decimals.
---
`catalog.get(productId)` returns `number | undefined`. Check for `undefined`, throw `new Error(`Unknown product ${productId}`)`, otherwise return the price.
