Implement `class Temperature`, which stores degrees Celsius and can only be created through factories.

1. `static readonly ABSOLUTE_ZERO = -273.15`.
2. A **private constructor** `private constructor(celsius: number)`.
3. Factories `static fromCelsius(value: number): Temperature` and
   `static fromFahrenheit(value: number): Temperature` (`C = (F - 32) * 5 / 9`).
4. Accessor pair `get celsius(): number` / `set celsius(value: number)`. The setter (and therefore every
   factory) throws a `RangeError` for values below `ABSOLUTE_ZERO`.
5. A **getter only** `get fahrenheit(): number` (`F = C * 9 / 5 + 32`).
6. `static get created(): number` — how many `Temperature` instances were created so far (use a private
   static counter).

```ts
const boiling = Temperature.fromFahrenheit(212);
boiling.celsius;     // 100
boiling.celsius = 0;
boiling.fahrenheit;  // 32
Temperature.created; // 1
```
