1. Decide what the type must remember: which required steps ran (`Done`, a union of literals) and which method was chosen (`M`, a literal).
2. Write the helper types first: `Missing<Done>` with `Exclude`, `BuildArgs<Done>` as a non-distributive conditional that returns `[]` or an impossible tuple, and `BodyArg<M>` that is `string` only for `POST`/`PUT`.
3. Add the type parameters with defaults (`never` for `Done`, the full `Method` union for `M`) so `request()` starts in the "nothing done" state.
4. Make every step return `RequestBuilder<...>` with its new type arguments; `method` needs its own type parameter to capture the literal.
5. Replace mutation with a `#next` helper that copies the config, so old builders keep their state and their type stays truthful.
6. Gate `body` with `BodyArg<M>` and `build` with the rest parameter, keep a runtime guard in `build`, and omit `body` from the result when it was never set.
7. Check the negative cases from the challenge compile with errors and that no `any` or cast remains.
