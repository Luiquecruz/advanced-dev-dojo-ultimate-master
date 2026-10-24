A form library uses functions as validators and formatters. Type them properly.

1. Replace the `Function` type: `Validator` must be exactly `(value: string) => boolean`.
2. `isNotEmpty` is declared as a `Validator` and returns whether the trimmed value has at least one character. Remove the annotation on its parameter: it must be **contextually typed** by `Validator`.
3. Implement `validateAll(value: string, validators: Validator[]): boolean` that returns `true` only when every validator accepts the value (an empty list returns `true`).
4. Change `Formatter` into an object type with a **call signature** `(value: number): string` and a `unit: string` property.
5. Implement `createFormatter(unit: string, decimals: number): Formatter`. The returned function formats a value with `decimals` decimals followed by a space and the unit, and exposes `unit`.

```ts
const kilos = createFormatter('kg', 1);
kilos(2.345);  // "2.3 kg"
kilos.unit;    // "kg"
```
