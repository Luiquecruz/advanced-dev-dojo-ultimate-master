Environment values are strings or `undefined`. `Number(env.PORT ?? 3000)` gives a number; `Number.isInteger` rejects `NaN` and decimals, and `Number('')` is `0`, which the range check rejects.
---
`parseArgs({ args, options: { port: { type: 'string', short: 'p' }, verbose: { type: 'boolean', short: 'v', default: false } } })` returns `{ values }`. Strict mode is the default, so `--nope` throws on its own.
---
In `main`, use two separate `try/catch` blocks: one around `parseCli` that returns `2`, one around `loadConfig` that returns `1`. Build the env for `loadConfig` with `cli.port === undefined ? env : { ...env, PORT: cli.port }` so the flag wins over the variable.
