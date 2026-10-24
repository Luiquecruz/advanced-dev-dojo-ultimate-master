1. Add `readonly`, `public` and `private` to the matching constructor parameters.
2. Remove the field declarations and the assignments; leave an empty constructor body.
3. Implement `applyDiscount` by multiplying the price by `1 - percent / 100` and rounding with `Math.round`.
4. Check that `formattedPrice` still reads the private field correctly.
