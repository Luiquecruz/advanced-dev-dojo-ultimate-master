1. Start with `ProductCard`: declare the two signal inputs and the output, then write the template. The card never decides anything; it shows what it is given and emits what happened.
2. Keep the card free of injected services. A component that only has inputs and outputs renders in any test, any story and any other screen without setup, which is the point of the split.
3. In `ProductsPage`, load the list with `httpResource` and an empty default so the template can loop without checking for `undefined`.
4. Hold the cart in a signal and derive the total with `computed`: the total can never disagree with the cart because it is not stored anywhere.
5. Implement `addToCart` with a guard clause for duplicates, then an immutable `update`. The page already binds `[selected]` to `isInCart` and `(add)` to `addToCart`, so the highlight follows the state.
6. Run the tests and note which ones need `provideHttpClient()`: only the container's. That difference is the practical benefit of the split.
