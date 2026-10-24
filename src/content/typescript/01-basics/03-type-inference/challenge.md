The cart module below is over-engineered in one place and under-typed in another. Lean on inference where it works and add an annotation where it does not.

1. Implement `cartTotal(items: CartItem[])` so it returns the sum of `price * quantity` for every item, using `reduce` with an initial value of `0`.
   - Do **not** write a return type annotation: the tests check that TypeScript infers `number` on its own.
   - Do **not** annotate the parameters of the `reduce` callback: they are contextually typed.
2. `discountCodes` starts as an empty array. Annotate it so it only accepts strings (`discountCodes.push(10)` must be a type error).

```ts
cartTotal(cartItems); // 210  (120 × 1 + 45 × 2)
cartTotal([]);        // 0
```
