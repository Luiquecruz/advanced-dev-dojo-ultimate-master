# Typed Configuration with Zod

Every backend reads configuration from environment variables: ports, database URLs, API keys, feature flags. `process.env` is the worst-typed object in Node: every value is `string | undefined`, typos return `undefined` silently, and `'false'` is truthy. The modern pattern is to **parse the environment once at startup** into a typed, validated, frozen object, and fail fast when it is wrong.

## What goes wrong without it

```ts
const port = process.env.PORT || 3000;
const signupEnabled = process.env.ENABLE_SIGNUP;
const db = process.env.DATABSE_URL;
```

- `port` is `string | number`; `port + 1` gives `'30001'`.
- `ENABLE_SIGNUP=false` makes `signupEnabled` the string `'false'`, which is truthy.
- The typo `DATABSE_URL` returns `undefined`, and the app crashes on the first query, minutes after deploy, or worse, falls back to a default database.

Configuration bugs are found in production because that is the only place the real environment exists. Validating at startup moves the failure to the deploy, where the orchestrator stops the rollout.

## A schema for the environment

```ts
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.url(),
  ENABLE_SIGNUP: z.stringbool().default(false),
  ALLOWED_ORIGINS: z
    .string()
    .default('')
    .transform((value) => value.split(',').map((item) => item.trim()).filter(Boolean)),
});

export type Config = z.infer<typeof envSchema>;
```

- `z.coerce.number()` turns `'8080'` into `8080` and rejects `'abc'`.
- `z.stringbool()` (Zod 4) parses `'true'`, `'1'`, `'yes'`, `'on'` and `'false'`, `'0'`, `'no'`, `'off'`, and rejects anything else. Never use `z.coerce.boolean()` for env vars: `Boolean('false')` is `true`.
- `transform` produces richer types (a list from a comma-separated string).
- Defaults belong in the schema, in one place, instead of `||` scattered around the code.

## Cross-field rules

Some variables are required only in some environments. `superRefine` sees the whole object:

```ts
envSchema.superRefine((env, ctx) => {
  if (env.NODE_ENV === 'production' && !env.SESSION_SECRET) {
    ctx.addIssue({ code: 'custom', path: ['SESSION_SECRET'], message: 'Required in production' });
  }
});
```

Zod runs object refinements only when every field parsed, so a missing secret is reported on the next attempt once the other variables are fixed.

## Loading: parse once, report everything, freeze

```ts
export function loadConfig(env: Record<string, string | undefined> = process.env): Readonly<Config> {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    throw new ConfigError(result.error.issues.map((issue) => ({ variable: String(issue.path[0]), message: issue.message })));
  }
  return Object.freeze(result.data);
}
```

- **Report every invalid variable at once**, so one deploy attempt shows all problems.
- **Never print values**: the error says `DATABASE_URL: Invalid URL`, never the URL, which may contain a password. Logs are read by many people and kept for a long time.
- **Freeze** the result so nothing mutates configuration at runtime.
- **Inject `env`** as a parameter with `process.env` as default: tests pass a plain object instead of mutating global state.
- Import `config` from one module everywhere; no other file reads `process.env`.

## Secrets and `.env` files

`.env` files are a development convenience (Node 20.6+ loads them with `node --env-file=.env`, no `dotenv` needed). They never go into git; commit a `.env.example` with names and fake values. In production, secrets come from the platform (Kubernetes secrets, a cloud secret manager, the PaaS dashboard). Configuration in the environment is a twelve-factor principle, covered in the shipping module.

Frontend parallel: Vite's `import.meta.env.VITE_*` values are **public**, baked into the bundle. On the server, environment variables can hold secrets precisely because they never reach the browser. Never expose server config to the client by accident.

## When to choose it

Validate configuration with a schema in every service that has more than a couple of variables; the cost is a dozen lines. Use Zod when the project already uses it; `@t3-oss/env-core` adds client/server separation on top of Zod for full-stack frameworks; `envalid` is a lighter alternative without Zod. For complex hierarchical configuration (many environments, nested files), libraries such as `convict` exist, but most services are better served by flat environment variables plus a schema.

## Working with AI

Ask for "a Zod env schema with coercion, `stringbool` for booleans, defaults in the schema, cross-field rules with `superRefine`, a `loadConfig(env = process.env)` that reports all invalid variable names without values and returns a frozen object". Review checklist:

- No `process.env.X` reads outside the config module.
- Numbers coerced and bounded; booleans via `stringbool`, never `z.coerce.boolean()` or `=== 'true'` sprinkled around.
- Required secrets have no defaults; production-only requirements are enforced.
- Error messages name variables but never print values.
- The app validates at startup, before listening, and exits non-zero on failure.
- `.env` is git-ignored and `.env.example` is up to date.
