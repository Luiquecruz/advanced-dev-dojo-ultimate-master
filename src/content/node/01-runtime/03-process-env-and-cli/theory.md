# process, Environment and CLI

Every Node program runs as an operating system **process**. The global `process` object is your window into it: environment variables, command-line arguments, the working directory, standard output and the exit code. In a frontend app the build tool injects `import.meta.env` at build time; on the server, configuration is read **at runtime** from the environment.

## Environment variables

```ts
const port = Number(process.env.PORT ?? 3000);
const nodeEnv = process.env.NODE_ENV ?? 'development';
const databaseUrl = process.env.DATABASE_URL;
```

Rules worth memorizing:

- Values are **always strings** (or `undefined`). `PORT=3000` gives `'3000'`; `DEBUG=false` gives the truthy string `'false'`. Convert and validate explicitly.
- Use `??` for defaults, not `||`: `||` also replaces an intentional empty string or `'0'` after conversion.
- Read and validate config **once, at startup**, into a typed object. Code that reads `process.env.X` deep inside a request handler fails at 3 a.m. instead of at deploy time.
- Required values (database URL, API keys) have no default: fail fast with a clear message.

```ts
export function loadConfig(env: Record<string, string | undefined>) {
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port)) {
    throw new Error('PORT must be an integer');
  }
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }
  return { port, databaseUrl: env.DATABASE_URL };
}
```

Passing `env` as a parameter instead of reading the global makes the function trivial to test. The TypeScript module of this track replaces the hand-written checks with a Zod schema.

### Where values come from

| Source | Use |
| --- | --- |
| Shell or `.env` file in development | `node --env-file=.env main.ts` (built in since Node 20.6; `dotenv` is the legacy package) |
| Hosting platform settings, container env, Kubernetes secrets | Production |
| A secrets manager (Vault, AWS Secrets Manager, Doppler) | Credentials that rotate |

Never commit `.env` files with real secrets; commit a `.env.example` with the names and fake values. Never log the whole config: it contains credentials.

## Command-line arguments

`process.argv` is an array of strings: the Node binary, the script path, then your arguments.

```ts
console.log(process.argv);
```

`node main.ts --port 8080 -v` prints `['/usr/local/bin/node', '/app/main.ts', '--port', '8080', '-v']`, so user arguments start at `process.argv.slice(2)`. Parsing them by hand gets messy fast (`--port=8080`, `-p 8080`, flags without values). Node has a built-in parser:

```ts
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    port: { type: 'string', short: 'p' },
    verbose: { type: 'boolean', short: 'v', default: false },
  },
  allowPositionals: true,
});
```

With `strict` (the default), an unknown option throws an error with `code: 'ERR_PARSE_ARGS_UNKNOWN_OPTION'`, which you turn into a usage message. For larger CLIs with subcommands and generated help, libraries such as `commander` or `yargs` still earn their place.

## Exit codes

The exit code tells the shell, CI or the container orchestrator whether the program succeeded: `0` is success, anything else is failure. Common conventions: `1` general error, `2` wrong usage. A failing CI step or a restarting container is often just a non-zero exit code.

```ts
if (!config.ok) {
  console.error('Config error: DATABASE_URL is required');
  process.exitCode = 1;
}
```

Prefer setting `process.exitCode` and letting the program finish. `process.exit(1)` stops **immediately**: pending writes to stdout, open requests and `finally` blocks in other async work are cut off. Reserve it for when you really must stop now. Write errors to `console.error` (stderr) and normal output to `console.log` (stdout), so `node main.ts > out.txt` still shows errors in the terminal.

## Other useful members

| Member | Purpose |
| --- | --- |
| `process.cwd()` | The directory Node was started from; relative file paths resolve against it |
| `process.platform`, `process.version` | OS and Node version checks |
| `process.on('SIGTERM', fn)` | Shutdown signals (graceful shutdown is covered in the scaling module) |
| `process.memoryUsage()`, `process.uptime()` | Basic health metrics |

## How this runs in Dev Dojo

`process.env` starts with `NODE_ENV=development`, `HOME` and `PATH`, and `process.argv.slice(2)` is empty, so **Run** shows what your program does without configuration. Tests call your functions with their own `env` and `args`.

## When to choose it

Environment variables are the standard for deployment configuration (the twelve-factor approach covered later): they differ per environment and keep secrets out of the code. Use config files (JSON, YAML) for large structured settings that are the same everywhere and belong in version control. Use CLI flags for per-invocation choices in scripts and tools. Combine them with a clear precedence, usually flag over env over default.

## Working with AI

Ask for "a `loadConfig(env)` function that validates every variable at startup and fails fast with a clear message". When reviewing generated code, check:

- No `process.env.X` reads scattered through business logic.
- Strings are converted and validated (`Number`, booleans compared with `'true'`), with `??` defaults.
- Required secrets have no fallback such as `'changeme'` or a real-looking key.
- Errors go to stderr and the exit code is non-zero; `process.exit()` is not used in library code.
- The config, tokens and connection strings are never logged.
