## Why a new compiler

For over a decade the TypeScript compiler was written in TypeScript and ran on Node. As codebases grew to millions of lines, full builds took minutes and editors needed many seconds to show the first error in large projects. In March 2025 the team announced **Project Corsa**: a port of the compiler and language service to **Go**, shipped as **TypeScript 7.0** on July 8, 2026. The JavaScript codebase (nicknamed "Strada") ends with the 6.x line.

Two things make the native compiler fast:

1. **Native code**: no JIT warm-up, compact memory layout, cheaper garbage collection.
2. **Shared-memory parallelism**: parsing, type checking and emit run on several threads at once, which a single Node process could not do efficiently.

### Why Go?

It is a **port, not a rewrite**. The team translated the existing code file by file, keeping the same structure and type checking logic, so behavior stays identical to 6.0. Go's structure is close to the existing functional, garbage-collected code style, while languages such as Rust would have required redesigning the compiler's cyclic data structures.

## How much faster

Full build times reported in the 7.0 announcement:

| Codebase | TypeScript 6.0 | TypeScript 7.0 | Speedup |
| --- | --- | --- | --- |
| VS Code | 125.7 s | 10.6 s | 11.9× |
| Sentry | 139.8 s | 15.7 s | 8.9× |
| Playwright | 12.8 s | 1.47 s | 8.7× |

Peak memory also dropped in every case, and opening a file with an error in the VS Code repository went from roughly 17.5 s to under 1.3 s until the first diagnostic.

## Using TypeScript 7

```bash
npm install -D typescript   # 7.x, still runs as `npx tsc`
npx tsc --build
```

During the previews the native compiler was published as `@typescript/native-preview` with a `tsgo` executable. Since 7.0 it is simply the `typescript` package and `tsc`; nightlies live under the `next` tag.

New flags control parallelism:

- `--checkers <n>`: number of type-checking workers (default 4).
- `--builders <n>`: number of project references built in parallel under `--build`.
- `--singleThreaded`: disables parallelism, useful for debugging and constrained CI machines.

The language server now speaks the standard **Language Server Protocol (LSP)** instead of the custom `tsserver` protocol, which makes integrating editors other than VS Code easier.

## What changes for your code

Type checking is structurally identical to 6.0, so the migration is about **configuration**. Every option deprecated in 6.0 is gone: `target: es5`, `downlevelIteration`, `moduleResolution: node10` and `classic`, `module: amd/umd/system/none`, `outFile`, `baseUrl`, and setting `esModuleInterop`, `allowSyntheticDefaultImports` or `alwaysStrict` to `false`. `stableTypeOrdering` is always on, so union members are ordered deterministically regardless of checking order.

The recommended path: make your project compile cleanly on **6.0 without `ignoreDeprecations`** and with `--stableTypeOrdering` enabled. Then 7.0 should produce the same results.

JavaScript projects type checked through JSDoc see stricter rules: `@enum` and `@class` are no longer special, closure-style function types are unsupported and values cannot be used as types (`typeof value` is required).

## The API gap

TypeScript 7.0 ships **no programmatic compiler API**. A new API, designed around the native process, is planned for 7.1. Tools that import `typescript` as a library (typescript-eslint, Volar for Vue, Angular's template checker, many codemods) keep running on the 6.0 API through the `@typescript/typescript6` package, which also provides a `tsc6` binary. A common setup installs both side by side:

```json
{
  "devDependencies": {
    "typescript": "npm:@typescript/typescript6@^6.0.2",
    "@typescript/native": "npm:typescript@^7.0.2"
  }
}
```

Language service plugins are not supported yet, so Vue, Svelte, Astro, MDX and Angular template editing still rely on 6.0 in the editor, while command-line checks can already use 7.0.

## Legacy vs modern

| | TypeScript ≤ 6.x | TypeScript 7.x |
| --- | --- | --- |
| Implementation | TypeScript on Node | Go, native binary |
| Parallelism | single-threaded | multi-threaded checking and builds |
| Editor protocol | `tsserver` protocol | LSP |
| Compiler API | stable `typescript` module | none in 7.0; new API planned for 7.1 |

## Pitfalls

- Bumping `typescript` to 7 can break linters and framework tooling that import its API. Alias the 6.0 package for them.
- Higher `--checkers` values use more memory; tune it on CI instead of maxing it out.
- Deprecated options silenced with `ignoreDeprecations` in 6.0 become hard errors in 7.0.
