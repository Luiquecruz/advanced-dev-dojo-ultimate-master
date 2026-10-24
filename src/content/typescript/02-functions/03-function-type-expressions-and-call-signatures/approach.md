1. Replace `Function` with a function type expression that names its `value` parameter.
2. Drop the parameter annotation in `isNotEmpty`; hover it to see `value: string` coming from `Validator`.
3. Implement `validateAll` with `every`, calling each validator with the value.
4. Rewrite `Formatter` as an object type that contains a call signature plus the `unit` property.
5. In `createFormatter`, store an arrow function in a `const`, format with `toFixed(decimals)`, attach `unit` as a property, and return the function.
