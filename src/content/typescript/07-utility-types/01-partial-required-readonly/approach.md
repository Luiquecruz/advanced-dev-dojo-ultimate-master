1. Type the defaults as `Readonly<Required<UserSettings>>` and add the missing values.
2. Change the parameter and return types to `Readonly`, `Partial` and `Required` as specified.
3. Create the updated settings with a spread into a new object and freeze it.
4. Resolve each property with `??` so both missing and explicitly `undefined` values use the default.
