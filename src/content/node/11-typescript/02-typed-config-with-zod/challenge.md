Replace scattered `process.env` reads with one typed, validated configuration.

1. Export `envSchema`, a `z.object` with:

| Variable | Rule | Default |
| --- | --- | --- |
| `NODE_ENV` | `'development'`, `'test'` or `'production'` | `'development'` |
| `PORT` | coerced integer from `1` to `65535` | `3000` |
| `DATABASE_URL` | a URL (`z.url()`) | required |
| `LOG_LEVEL` | `'debug'`, `'info'`, `'warn'` or `'error'` | `'info'` |
| `ENABLE_SIGNUP` | boolean string with `z.stringbool()` | `false` |
| `ALLOWED_ORIGINS` | comma-separated string transformed to a trimmed `string[]` without empty items | `[]` (from `''`) |
| `SESSION_SECRET` | optional string of at least 32 characters | none |

   Add a `superRefine`: when `NODE_ENV` is `'production'` and `SESSION_SECRET` is missing, add an issue with `path: ['SESSION_SECRET']` and the message `Required in production`.

2. Export `Config` as `z.infer<typeof envSchema>`.
3. Export `class ConfigError extends Error` with an `issues: { variable: string; message: string }[]` property set from the constructor argument. Its message is `Invalid environment: ` followed by the invalid variable names joined with `, ` (for example `Invalid environment: PORT, DATABASE_URL`). It must never contain the values of the variables.
4. Export `loadConfig(env = process.env)`: parse `env` with `envSchema.safeParse`; on failure throw a `ConfigError` with one entry per issue (`variable` is the first element of the issue path); on success return the parsed config frozen with `Object.freeze`.
