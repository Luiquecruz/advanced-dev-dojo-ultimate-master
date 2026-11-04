Complete `class Temperature` in `main.py`. The value is stored once, in Celsius, and exposed through three properties.

## `Temperature(celsius=0.0)`

- **`celsius`**: read and write. Writing a value below `-273.15` raises `ValueError` whose message contains `absolute zero`. **Deleting** it (`del t.celsius`) resets the temperature to `0.0`.
- **`fahrenheit`**: read and write. `F = C × 9 / 5 + 32`. Writing converts to Celsius and is validated exactly like `celsius`.
- **`kelvin`**: read-only. `K = C + 273.15`. Assigning raises `AttributeError`.

Rules the tests check:

- Construction is validated too: `Temperature(-300)` raises `ValueError`.
- A rejected write leaves the previous value unchanged.
- `celsius`, `fahrenheit` and `kelvin` are `property` objects on the class.

Floats are compared with a tolerance, so `100 °C → 212 °F` may come out as `212.00000000000003`.
