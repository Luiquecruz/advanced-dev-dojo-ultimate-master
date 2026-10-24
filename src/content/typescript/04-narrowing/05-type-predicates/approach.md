1. Give `isUser` the return type `value is User`.
2. Narrow `unknown` to a non-null object, then use `in` and `typeof` to check `id` and `name`, chaining the checks with `&&`.
3. Pass `isUser` directly to `filter` in `validUsers`; the predicate overload of `filter` returns `User[]`.
4. In `compact`, replace `filter(Boolean)` with an arrow function that compares against `null`/`undefined`, and remove the `as` assertion. Hover the arrow function to see the inferred predicate.
