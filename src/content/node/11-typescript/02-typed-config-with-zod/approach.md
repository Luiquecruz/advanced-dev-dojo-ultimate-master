1. Turn the table into the schema one row at a time, choosing the parser by the target type: enum, coerced number with bounds, URL, `stringbool`, a transform for the list, an optional string for the secret.
2. Put every default in the schema so the rest of the code never repeats fallback logic.
3. Express the environment-dependent rule as a refinement on the whole object, because it reads two fields at once.
4. Design the error for operators: one entry per invalid variable, a message built from names only, and the full detail available in `issues`. Values may be secrets, so they never appear.
5. Accept `env` as a parameter defaulting to `process.env`; tests pass plain objects and production calls `loadConfig()` with no arguments.
6. Freeze the parsed object so configuration is read-only for the lifetime of the process.
