1. Type the parameter of `assertNever` as `never` and throw an `Error` with the JSON of the value.
2. Add the missing `triangle` case to `area`.
3. Replace the `default` body with `return assertNever(shape)`; it compiles because every member was handled and `shape` narrowed to `never`.
4. Temporarily delete one case to see the compiler name the forgotten member, then restore it.
