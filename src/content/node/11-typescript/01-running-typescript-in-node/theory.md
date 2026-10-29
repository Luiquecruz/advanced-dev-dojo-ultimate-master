# Running TypeScript in Node

For years running TypeScript on the server meant a build step or a loader. Modern Node.js runs `.ts` files directly by **stripping types**, but it does not type-check. Knowing the difference between *running*, *type-checking* and *building* is what lets you pick the right tool for development, CI and production.

## Three separate jobs

| Job | Question it answers | Tools |
| --- | --- | --- |
| **Run** | Can Node execute this file? | `node file.ts` (type stripping), `tsx`, `ts-node` (legacy) |
| **Type-check** | Is the code type-correct? | `tsc --noEmit`, editor, TypeScript 7 native compiler (`tsgo`) |
| **Build** | What do we ship? | `tsc` (JS + `.d.ts`), esbuild, tsup/tsdown, bundlers |

No runner type-checks: `tsx` and Node both execute code with type errors. Type-checking always belongs in CI (`tsc --noEmit`) and in the editor.

## Native type stripping

```bash
node src/server.ts
```

Since Node 23.6 (and 22.18 on the 22 line) Node removes type annotations and runs the result, with no configuration and no source maps needed: annotations are replaced by whitespace so line numbers stay correct. The constraint is that only **erasable** syntax is allowed, syntax that disappears without generating code:

| Works | Fails without `--experimental-transform-types` |
| --- | --- |
| Type annotations, interfaces, type aliases, generics | `enum` (use a `const` object `as const` or a union) |
| `import type`, `satisfies`, `as` | `namespace` with runtime code |
| Optional and readonly properties | Constructor parameter properties (`constructor(private repo: Repo)`) |
| | Legacy decorators with `emitDecoratorMetadata` (NestJS style) |

Enable `"erasableSyntaxOnly": true` in `tsconfig.json` (TypeScript 5.8+) and the compiler flags those constructs in the editor.

Two more rules come from Node not reading `tsconfig.json`:

- Relative imports need the real extension: `import { app } from './app.ts'`. Set `"allowImportingTsExtensions": true` (with `noEmit`) or `"rewriteRelativeImportExtensions": true` when `tsc` also emits JS.
- Type-only imports must say so (`import type { User } from './types.ts'`), otherwise Node tries to load a runtime export that does not exist. `"verbatimModuleSyntax": true` enforces it.
- Path aliases (`@/services`) are not resolved; use `package.json` `imports` (`#services/*`) instead.
- Files inside `node_modules` are never stripped: published packages must ship JavaScript.

## tsx: the development runner

`tsx` uses esbuild to transform **any** TypeScript (enums and parameter properties included), supports `tsconfig` paths and has a watch mode:

```bash
npx tsx watch src/server.ts
```

It is the pragmatic choice for development scripts and projects that use non-erasable syntax. `ts-node` is the legacy option: slower, more configuration, mostly found in older codebases.

## Building for production

You can deploy `.ts` files and run them with `node` when every file is erasable. Many teams still build:

- **Libraries** run `tsc` to emit `.js` plus `.d.ts` declaration files, because consumers need JavaScript and types.
- **Services** often bundle with esbuild, tsup or tsdown into one file: faster cold starts (serverless), smaller containers, no dev dependencies at runtime.

## module: nodenext

Node has two module systems (covered in the runtime module): ESM and CommonJS, chosen per file by the extension (`.mts`/`.cts`, `.mjs`/`.cjs`) or by `"type"` in `package.json`. `"module": "nodenext"` makes TypeScript follow exactly Node's rules, so the editor rejects imports that would fail at runtime (missing extensions, `require` in ESM). For Node services it is the correct setting; `"moduleResolution": "bundler"` is for code that a bundler processes.

A minimal modern `tsconfig.json` for a Node service:

```json
{
  "compilerOptions": {
    "target": "es2023",
    "module": "nodenext",
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true
  }
}
```

## When to choose it

| Situation | Choose |
| --- | --- |
| New service, erasable syntax only | `node src/server.ts` in dev and prod, `tsc --noEmit` in CI |
| Needs enums, parameter properties, path aliases or watch mode with tsconfig paths | `tsx` in dev, a bundler or `tsc` for prod |
| Publishing an npm package | `tsc` (or tsdown) emitting JS + `.d.ts` |
| Serverless with cold-start sensitivity | Bundle with esbuild/tsup |
| NestJS (decorator metadata) | Its CLI build (`tsc` or SWC); stripping is not enough |

Deno and Bun run TypeScript natively too, with their own transpilers; the same rule applies: they run, they do not type-check.

## Working with AI

Tell the assistant the Node version and how the project runs TypeScript ("Node 24 type stripping, erasable syntax only, `.ts` extensions in imports"). Otherwise it generates enums, parameter properties and extensionless imports that crash at startup. Review checklist:

- No `enum`, `namespace` or constructor parameter properties when using type stripping.
- Relative imports carry `.ts`; type-only imports use `import type`.
- A `typecheck` script (`tsc --noEmit`) runs in CI; nothing assumes the runner checks types.
- `tsconfig` uses `module: nodenext` for Node code, not `bundler`.
- Published packages ship compiled JavaScript and declarations.
