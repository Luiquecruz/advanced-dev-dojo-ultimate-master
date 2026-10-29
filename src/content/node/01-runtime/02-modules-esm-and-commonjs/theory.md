# Modules: ESM and CommonJS

Node has two module systems. **ES modules** (ESM: `import`/`export`) are the JavaScript standard, the same syntax your bundler handles in a React or Vue app. **CommonJS** (CJS: `require`/`module.exports`) is Node's original system, still found in older packages, config files and a large part of npm.

## The two syntaxes side by side

```ts
import { readFile } from 'node:fs/promises';
import slugify from './slugify.ts';

export const VERSION = '1.0.0';
export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}
export default function createPost(title: string) {
  return { id: createId('post'), slug: slugify(title) };
}
```

The legacy CommonJS equivalent:

```ts
const { readFile } = require('node:fs/promises');
const slugify = require('./slugify');

module.exports = { VERSION: '1.0.0', createId, createPost };
```

| | ESM | CommonJS |
| --- | --- | --- |
| Loading | Static: imports are resolved before code runs | Dynamic: `require` is a function call at runtime |
| Top-level `await` | Yes | No |
| File extensions in relative imports | Required (`./db.ts`, `./db.js`) | Optional (`./db`) |
| `__dirname`, `__filename` | `import.meta.dirname`, `import.meta.filename` | Available |
| Tree-shaking, static analysis | Yes | Limited |

## Named vs default exports

A module can have many **named** exports and one **default** export.

```ts
export function createId() {}
export default function slugify() {}

import slugify, { createId } from './text.ts';
import { default as slug } from './text.ts';
```

Named exports keep one name across the codebase, work with auto-imports and refactoring tools, and make it obvious when something is renamed. Default exports let every importer choose a name, which is why many teams use named exports for application code and keep defaults for framework conventions.

A file that collects and re-exports a package's public pieces is a **barrel**:

```ts
export { default as slugify } from './slugify.ts';
export { createId } from './ids.ts';
```

Prefer explicit re-exports over `export * from './ids.ts'`: the star leaks every helper you add later into your public API.

## How Node decides which system a file uses

1. `.mjs` / `.mts` is always ESM; `.cjs` / `.cts` is always CommonJS.
2. `.js` / `.ts` follow the nearest `package.json`: `"type": "module"` means ESM, otherwise CommonJS.
3. Without a `type` field, recent Node versions detect ESM syntax and run the file as ESM, with a small startup cost. Declare `"type"` explicitly.

```json
{
  "name": "@acme/posts",
  "type": "module",
  "exports": {
    ".": "./dist/main.js",
    "./ids": "./dist/ids.js"
  }
}
```

## The `exports` map

`exports` defines a package's **public entry points**. With the map above, consumers can import `@acme/posts` and `@acme/posts/ids`; `@acme/posts/dist/slugify.js` fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`. Internals can be refactored freely. Conditional exports (`"import"`, `"require"`, `"types"`) let one package ship builds for both systems.

## The `node:` prefix

```ts
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
```

The prefix marks a built-in module explicitly: it cannot be hijacked by an npm package with the same name, it is faster to resolve, and readers see at a glance what is built in. Some newer modules (`node:test`, `node:sqlite`) only exist with the prefix.

## Interop and pitfalls

- **ESM importing CJS** works: `module.exports` becomes the default export, and Node detects most named exports.
- **CJS requiring ESM** works in Node 22.12+ and 20.19+ (`require(esm)`) as long as the ES module has no top-level `await`. Before that, CJS had to use `await import()`.
- **Dual package hazard**: a package loaded once through `import` and once through `require` may create two copies of its state.
- **Circular imports** run, but one side may see `undefined` bindings during startup. Treat a cycle as a design smell.
- **Extensions**: `import './db'` fails in Node ESM. TypeScript projects compiled by `tsc` write `./db.js` in the source; projects that run `.ts` directly write `./db.ts`.

## How this runs in Dev Dojo

Your files are converted to CommonJS behind the scenes, so the syntax you write is ESM and behaves like Node ESM for imports and exports. `import.meta` and top-level `await` are not available; wrap async startup code in `async function main()`. Use a flat folder of files: imports resolve from the project root.

## When to choose it

New code: **ESM**, `"type": "module"`, `node:` prefixes, named exports, an explicit `exports` map for anything published. Keep **CommonJS** only for an existing CJS codebase or tooling that requires it; migrate file by file now that `require(esm)` works. Publish dual ESM/CJS builds only when you have CJS consumers you cannot drop, because they add build complexity and the dual package hazard.

## Working with AI

State the module system in the prompt ("ESM only, `type: module`, Node 24"). When reviewing generated code, check:

- No `require`, `module.exports` or `__dirname` inside ESM files.
- Relative imports carry the extension your setup needs (`.js` with `tsc`, `.ts` when running TypeScript directly).
- Built-ins use the `node:` prefix.
- Barrels re-export explicit names instead of `export *`.
- `package.json` declares `type` and, for libraries, an `exports` map that matches the files that exist.
