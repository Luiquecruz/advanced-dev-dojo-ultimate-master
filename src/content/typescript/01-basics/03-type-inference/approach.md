1. Call `items.reduce` with two arguments: a callback and the initial value `0`.
2. In the callback, add `item.price * item.quantity` to the accumulator and return it. Leave both parameters unannotated.
3. Return the result of `reduce` directly and keep the function header without a return type.
4. Hover `cartTotal` to confirm TypeScript infers `number`.
5. Add `: string[]` to the `discountCodes` declaration so the array no longer evolves with each `push`.
