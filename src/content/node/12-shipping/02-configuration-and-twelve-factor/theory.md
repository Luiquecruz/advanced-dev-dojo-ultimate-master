# Configuration and the Twelve-Factor App

The same build of your API runs on your laptop, in CI, in staging and in production. What changes between them is **configuration**: database URLs, API keys, log levels, feature flags. The **Twelve-Factor App** methodology (written by Heroku engineers in 2011) is still the shortest checklist for building services that deploy cleanly to any modern platform: containers, PaaS or serverless.

## The factors that matter most day to day

| Factor | Rule | In a Node service |
| --- | --- | --- |
| III. Config | Store config in the environment | `process.env.DATABASE_URL`, never a committed `config.prod.json` with secrets |
| IV. Backing services | Databases, queues, caches are attached resources | Swapping Postgres hosts is a config change, not a code change |
| V. Build, release, run | Build once; release = build + config; run it | The same Docker image is promoted from staging to production |
| VI. Processes | Stateless processes; state lives in backing services | No sessions or uploads in memory or on local disk |
| VII. Port binding | The app exports HTTP by binding a port | `serve({ fetch: app.fetch, port: Number(process.env.PORT) })` |
| IX. Disposability | Fast startup, graceful shutdown | Handle `SIGTERM`, drain requests, close pools (scaling module) |
| X. Dev/prod parity | Keep environments similar | Postgres locally in Docker, not SQLite locally and Postgres in prod |
| XI. Logs | Treat logs as event streams | Write JSON lines to stdout; the platform ships them |
| XII. Admin processes | One-off tasks run as the same code | Migrations as `npm run migrate` in the same image |

The others (codebase, dependencies, concurrency) are mostly given by Git, `package.json` with a lockfile, and horizontal scaling.

## One config module, validated at startup

Reading `process.env` all over the codebase spreads string parsing and typos everywhere. Read it **once**, validate it, export a typed object, and crash immediately when something is wrong:

```ts
import { z } from 'zod';

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export const config = ConfigSchema.parse(process.env);
```

A missing `JWT_SECRET` now fails the deploy with a clear message, instead of signing tokens with `undefined` at 3 a.m. The TypeScript module of this course builds this pattern hands-on.

Inject the parsed `config` into the composition root; services receive configured clients, not raw variables.

## Local development

- `.env` files hold local values; load them with `node --env-file=.env` (built into Node 20.6+) or dotenv. **Commit `.env.example`** with every variable and safe placeholders; **never commit `.env`**.
- Defaults are fine for harmless values (`PORT`, `LOG_LEVEL`). Secrets and URLs of real resources have **no defaults**: a default production database URL is an accident waiting to happen.

## Secrets

Environment variables are the interface, not the storage. Production secrets live in a secret manager (AWS Secrets Manager, GCP Secret Manager, Vault, Doppler, the platform's encrypted variables) and are injected into the environment at runtime. Rotate them, scope them per environment, and never log them: redact `authorization`, `password`, `token` fields in structured logs.

## Feature flags and per-environment behavior

Prefer explicit flags (`FEATURE_NEW_CHECKOUT=true`, or a flag service such as LaunchDarkly, Unleash, GrowthBook) over `if (NODE_ENV === 'production')` scattered in business code. `NODE_ENV` should mean "how optimized is this build", not "which features are on".

## Pitfalls

- `Number(process.env.PORT)` returns `NaN` for a typo; `process.env.FLAG === 'false'` is a truthy string if you only check `if (process.env.FLAG)`.
- Config read at import time inside many modules makes tests depend on global state; read once, inject.
- Baking secrets into Docker images or frontend bundles (`VITE_` variables are public).
- Different config shapes per environment ("prod has `DB_HOST`, staging has `DATABASE_URL`").
- Storing uploads on local disk of a stateless container: they vanish on redeploy.

## When to choose it

Apply environment-based, validated configuration to every service, from day one: it costs a dozen lines. Use a secret manager as soon as more than one person or environment touches production. Config files (YAML, JSON) are still fine for non-secret, structured, versioned settings such as rate-limit tables, as long as secrets and environment-specific endpoints stay in the environment.

## Working with AI

Ask for "a single `config.ts` that validates `process.env` with Zod at startup, with no defaults for secrets, plus a `.env.example`". When reviewing generated code:

- No `process.env` outside the config module and no hardcoded URLs, keys or passwords.
- Numbers and booleans are parsed explicitly (`z.coerce.number()`, `z.stringbool()` or an enum), not with truthiness checks.
- `.env` is in `.gitignore`; `.env.example` lists every variable.
- Secrets have no defaults and are never logged.
- The process is stateless: nothing that must survive a restart lives in memory or local disk.
