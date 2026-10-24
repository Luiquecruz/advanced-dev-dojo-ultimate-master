1. Match `F` against a function pattern with `infer R` in the return position for `MyReturnType`, falling back to `never`.
2. Move the `infer` to the rest parameter (`...args: infer P`) for `MyParameters`; the result is a labeled tuple.
3. For `FirstArgument`, infer the whole parameter tuple `P` first, then nest a second conditional type matching `P` against `[infer First, ...unknown[]]`, so an empty parameter list and non-functions both fall to `never`.
4. Match `Promise<infer V>` once for `UnwrapPromise`, returning `T` unchanged when it does not match.
5. Use a template literal pattern with a constrained `infer N extends number` for `ToNumber`.
