Write the startup code of a small service: configuration from the environment, flags from the command line, and a meaningful exit code. Every function receives its inputs (`env`, `args`) as parameters, so tests never touch the real `process`.

1. `loadConfig(env)` returns `{ port, nodeEnv, databaseUrl }`:
   - `port`: `Number(env.PORT)`, default `3000`. When it is not an integer between `1` and `65535` (`'abc'`, `'0'`, `'70000'`, `'3000.5'`, `''`), throw `Error('PORT must be an integer between 1 and 65535')`.
   - `nodeEnv`: `env.NODE_ENV`, default `'development'`.
   - `databaseUrl`: `env.DATABASE_URL`, required. When missing or empty, throw `Error('DATABASE_URL is required')`.
2. `parseCli(args)` uses `parseArgs` from `'node:util'` with the options `port` (string, short `p`) and `verbose` (boolean, short `v`, default `false`), in strict mode (unknown options throw). It returns `{ port, verbose }`; `port` is `undefined` when not given.
3. `main(args, env)` returns an exit code:
   - `parseCli` throws: `console.error('Usage error: ' + message)` and return `2`.
   - The `--port` flag, when given, overrides `env.PORT`. `loadConfig` throws: `console.error('Config error: ' + message)` and return `1`.
   - Success: `console.log('Starting in <nodeEnv> on port <port>')` (for example `Starting in production on port 8080`) and return `0`. With `--verbose` you may log more details, but never the database URL: it contains credentials.
4. Keep the last line, which stores the result in `process.exitCode`. Do not call `process.exit()`.

Press **Run**: there is no `DATABASE_URL` in the environment, so the program should print the config error and exit with code 1.
