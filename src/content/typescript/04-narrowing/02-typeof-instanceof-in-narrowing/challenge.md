These functions use type assertions, so they compile but crash or return wrong values. Replace every assertion with a real type guard. The keyword `as` is not allowed.

1. `toTimestamp(value: string | number | Date): number`
   - `Date` → `value.getTime()` (use `instanceof`)
   - `number` → the number itself
   - `string` → `Date.parse(value)`
2. `describeError(error: unknown): string`
   - an `Error` instance → its `message`
   - a string → the string itself
   - anything else → `"Unknown error"`
3. `area(shape: Circle | Square): number`
   - circles (they have `radius`) → `Math.PI * radius ** 2`
   - squares (they have `side`) → `side ** 2`
   Use the `in` operator.
