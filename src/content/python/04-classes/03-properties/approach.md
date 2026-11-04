1. Choose the single source of truth: one stored Celsius value under a private name. Every other scale is derived from it.
2. Write the `celsius` getter, a setter that rejects values below absolute zero before storing, and a deleter that stores `0.0`.
3. List every way a value can enter the object (constructor, `celsius` writes, `fahrenheit` writes) and make each one pass through the validating setter.
4. Add `fahrenheit` as a getter plus a setter that converts and delegates, and `kelvin` as a getter only.
5. Check a rejected write: the error is raised before anything is stored, so the old value survives.
