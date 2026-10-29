1. Treat the environment as untrusted text: convert `PORT` with `Number`, apply defaults with `??`, then validate the result instead of the raw string.
2. Throw errors with exact, human-readable messages; `loadConfig` stays a pure function of `env`, which is why it is easy to test.
3. Let `parseArgs` do the parsing: declare each option with its type, short alias and default, and rely on strict mode to reject unknown flags.
4. Define precedence once: a CLI flag overrides the environment, which overrides the default. Merging `{ ...env, PORT: cli.port }` reuses all of `loadConfig`'s validation for the flag.
5. Map failure kinds to exit codes in `main`: usage problems are `2`, configuration problems `1`, success `0`. Errors go to stderr with `console.error`.
6. Log only safe values: the start line says where the service runs, never the connection string.
7. Return the code and let the last line assign `process.exitCode`, so the program ends naturally instead of being cut off by `process.exit()`.
