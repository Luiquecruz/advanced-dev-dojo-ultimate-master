1. Add `as const` to `HTTP_METHODS` so the strings keep their literal types and the array becomes a readonly tuple.
2. Lift the value into the type world with `typeof` and index it with `[number]` to get the element union.
3. Add `as const` to `defaultRequest` so `method` is `"GET"` instead of `string`; it now fits `HttpMethod`.
4. Build the description with a template literal.
