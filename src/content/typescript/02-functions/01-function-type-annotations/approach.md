1. Replace the three `any` annotations of `calculateDiscount` with `number`; the body is already correct.
2. Annotate `formatPrice`'s parameters and add `: string` before the arrow, then build the text with a template literal and `toFixed(2)`.
3. Declare `loadPrice` with the `async` keyword and a `Promise<number>` return type.
4. Read the price from the `Map`, which yields `number | undefined`.
5. Throw an `Error` with the expected message when the value is `undefined`; otherwise return it, which resolves the promise.
