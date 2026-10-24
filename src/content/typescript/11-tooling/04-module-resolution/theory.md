## From specifier to file

**Module resolution** is the algorithm that turns an import specifier such as `'./utils.js'`, `'react'` or `'#/config'` into a file on disk. TypeScript must use the **same rules as the runtime or bundler** that will actually load your code; otherwise the compiler accepts imports that crash at runtime, or rejects imports that work. The `moduleResolution` option chooses the rules, and `module` describes the output format and usually implies the resolution.

| `moduleResolution` | Mirrors | Use for |
| --- | --- | --- |
| `nodenext` / `node16` | Node's ESM and CommonJS rules | code run directly by Node, published libraries |
| `bundler` | Vite, webpack, esbuild, Bun | applications compiled by a bundler |
| `node10` (alias `node`) | Node's old `require` algorithm | deprecated in TypeScript 6.0, removed in 7.0 |
| `classic` | TypeScript 1.x rules | removed |

With TypeScript 6.0 defaults (`module: esnext`) resolution is `bundler`. `--module nodenext` implies `--moduleResolution nodenext`; `--module node20` (TypeScript 5.9+) is the stable, non-moving variant for Node 20+.

## nodenext: Node's real rules

Node decides per file whether it is ESM or CommonJS:

- `.mts` / `.mjs` files are always ESM, `.cts` / `.cjs` always CommonJS
- `.ts` / `.js` files follow the nearest `package.json` `"type"` field (`"module"` means ESM)

In ESM files relative imports must name a full file, including the extension of the **output** file:

```ts
import { sum } from './math.js';       // OK: resolves to math.ts during type checking
import { sum } from './math';          // Error: relative import paths need explicit file extensions
import { sum } from './math/index.js'; // directories are not resolved automatically
```

If you prefer writing `.ts` extensions, `rewriteRelativeImportExtensions` (5.7+) lets you write `./math.ts` and rewrites it to `./math.js` on emit, which matches what Node's type stripping expects.

## bundler: relaxed but modern

Bundlers accept extensionless imports and `index` files, so `bundler` resolution does too. Unlike `node10`, it still honours `package.json` `"exports"`. `allowImportingTsExtensions` lets you write `./math.ts` when another tool does the emitting (`noEmit` or `emitDeclarationOnly`). Since 6.0, `bundler` can also be combined with `--module commonjs`.

## package.json exports and imports

Modern packages describe their public entry points with `"exports"`. Conditions are matched in order, and TypeScript reads the `types` condition first:

```json
{
  "name": "ui-kit",
  "type": "module",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./button": { "types": "./dist/button.d.ts", "default": "./dist/button.js" }
  },
  "imports": {
    "#/*": "./src/*"
  }
}
```

- Deep imports that are not listed (`ui-kit/dist/internal.js`) are rejected under `nodenext` and `bundler`, because Node would reject them too. `node10` ignored `exports` completely, a major reason it is deprecated.
- `"imports"` defines private **subpath imports** that start with `#`. They work at runtime in Node and bundlers without any alias configuration. TypeScript 6.0 supports the short `#/` prefix.
- `customConditions` adds your own conditions (e.g. `"development"`) to the list TypeScript matches.

## paths: compile-time aliases

`paths` maps specifiers to files **for the type checker only**:

```json
{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }
```

`tsc` does not rewrite the import, so the runtime must understand the alias too (Vite `resolve.alias`, a bundler plugin). Since `baseUrl` is deprecated in 6.0, write `paths` targets relative to the tsconfig file. For code that Node runs directly, prefer `"imports"` subpaths: one definition works for both TypeScript and the runtime.

## Debugging resolution

- `tsc --traceResolution` prints every step the compiler takes for each import.
- `tsc --explainFiles` lists why each file is part of the program.
- The "Are the types wrong?" tool (arethetypeswrong.github.io) checks a published package under every resolution mode.

## Pitfalls

- Using `bundler` for a Node library hides missing extensions until users run the code.
- Dual ESM/CommonJS packages need separate type files per format (`.d.mts` / `.d.cts`) or they lie to one group of consumers.
- `paths` without a matching runtime alias compiles fine and fails with `Cannot find module` at runtime.
