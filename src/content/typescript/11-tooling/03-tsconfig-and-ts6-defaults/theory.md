## What tsconfig.json does

`tsconfig.json` marks a folder as the root of a TypeScript project and tells `tsc`, your editor and most tools how to compile it. Its main sections:

```json
{
  "extends": "@tsconfig/strictest/tsconfig.json",
  "compilerOptions": { "outDir": "dist" },
  "include": ["src"],
  "exclude": ["**/*.test.ts"],
  "references": [{ "path": "../shared" }]
}
```

- `include` / `exclude` / `files` select the source files (default: everything under the folder).
- `extends` inherits options from another config, often a shared package such as `@tsconfig/node24`.
- `references` splits a monorepo into **project references** built with `tsc --build`.

Compiler options fall into a few families:

| Family | Examples |
| --- | --- |
| Language and environment | `target`, `lib`, `jsx`, `useDefineForClassFields` |
| Modules | `module`, `moduleResolution`, `verbatimModuleSyntax`, `paths` |
| Type checking | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| Emit | `outDir`, `rootDir`, `declaration`, `sourceMap`, `noEmit` |
| Interop | `esModuleInterop`, `isolatedModules`, `erasableSyntaxOnly` |

## strict is a family of flags

`strict` turns on `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `useUnknownInCatchVariables`, `noImplicitThis`, `alwaysStrict` and `strictBuiltinIteratorReturn`. New checks added to the family are enabled automatically in later versions. Two valuable checks are **not** included and must be opted into:

- `noUncheckedIndexedAccess`: `array[i]` and `record[key]` include `| undefined`.
- `exactOptionalPropertyTypes`: `prop?: string` no longer accepts an explicit `undefined`.

## TypeScript 6.0: new defaults

TypeScript 6.0 (March 2026) is the last JavaScript-based release and a bridge to the native TypeScript 7. It modernised the defaults so a near-empty config behaves like a modern project:

| Option | Old default | 6.0 default |
| --- | --- | --- |
| `strict` | `false` | `true` |
| `target` | `es5` | latest standard (`es2025`) |
| `module` | `commonjs` | `esnext` |
| `moduleResolution` | `node10` | follows `module` (`bundler` for ESM) |
| `types` | every `@types/*` package | `[]` |
| `rootDir` | inferred from input files | the folder containing `tsconfig.json` |
| `noUncheckedSideEffectImports` | `false` | `true` |
| `libReplacement` | `true` | `false` |
| `esModuleInterop` / `allowSyntheticDefaultImports` | `false` | always `true` (cannot be disabled) |

`tsc --init` now writes a short, modern config: `module: nodenext`, `target: esnext`, `types: []`, `strict`, `verbatimModuleSyntax`, `isolatedModules`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `moduleDetection: force` and `skipLibCheck`.

## Deprecations

Using any of these in 6.0 reports an error such as `TS5107: Option 'target=ES5' is deprecated and will stop functioning in TypeScript 7.0`:

- `target: es5` (the minimum is now ES2015) and `downlevelIteration`
- `moduleResolution: node` / `node10` (use `nodenext` or `bundler`); `classic` is removed
- `module: amd`, `umd`, `system`, `none`, and `outFile` (use a bundler)
- `baseUrl` (write `paths` relative to the config file instead)
- `alwaysStrict: false`, `esModuleInterop: false`, `allowSyntheticDefaultImports: false`
- `import ... assert {}` (use `with {}`) and the `module Foo {}` namespace keyword

You can silence them temporarily with `"ignoreDeprecations": "6.0"`, but TypeScript 7.0 removes these options entirely, so treat it as a migration window, not a fix.

## A modern config

```json
{
  "compilerOptions": {
    "target": "es2024",
    "lib": ["es2024", "dom"],
    "types": ["node"],
    "module": "nodenext",
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "outDir": "dist",
    "declaration": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

`strict` is no longer needed explicitly in 6.0, but keeping it documents intent and helps tools that read the file.

## Migrating to 6.0

1. Remove `baseUrl`, rewriting `paths` entries relative to the config (`"@/*": ["./src/*"]`).
2. Replace `moduleResolution: node` with `bundler` (apps built by Vite, webpack, esbuild) or `nodenext` (code run by Node, libraries).
3. Add the `types` you rely on globally.
4. If you relied on non-strict defaults, set `"strict": false` explicitly and plan to enable it gradually.
5. Turn on `--stableTypeOrdering` once to see whether TypeScript 7's deterministic type ordering changes any output (it slows checking, so do not keep it on).

## Pitfalls

- `lib` must match your runtime. `target` only controls syntax downleveling; it does not polyfill APIs.
- Options in `extends` are merged shallowly: `include`, `exclude` and `files` in the child replace the parent's lists.
- `rootDir` now defaults to the config folder, so projects that put `tsconfig.json` above `src` may see output in `dist/src/`. Set `"rootDir": "./src"` explicitly.
