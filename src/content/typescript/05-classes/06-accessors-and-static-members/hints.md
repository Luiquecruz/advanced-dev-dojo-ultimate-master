Static members are declared with `static`: `static readonly ABSOLUTE_ZERO = -273.15;` and `static #created = 0;`. Read them with `Temperature.ABSOLUTE_ZERO`.
---
Put the validation in `set celsius(value: number)` and call the setter from the constructor (`this.celsius = celsius`), so factories validate for free.
---
Increment `Temperature.#created` in the constructor and expose it with `static get created(): number { return Temperature.#created; }`. `fahrenheit` only needs a `get`.
