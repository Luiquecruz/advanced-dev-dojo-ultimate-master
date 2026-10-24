## Every file with import or export is a module

TypeScript follows ECMAScript modules (ESM). A file that contains a top-level `import` or `export` is a **module** with its own scope; anything else is a global **script** whose declarations leak into every other script. Setting `"moduleDetection": "force"` (the `tsc --init` default) treats every non-declaration file as a module, which avoids accidental globals.

```ts
// math.ts
export const PI = 3.14159;
export function area(radius: number): number {
  return PI * radius ** 2;
}
export default class Circle {}

// app.ts
import Circle, { area, PI as pi } from './math.js';
import * as math from './math.js';
```

Types are exported and imported exactly like values:

```ts
export interface User { id: number; name: string }
export type UserId = User['id'];
```

## Type-only imports

Types disappear from the emitted JavaScript. If an import is used only as a type, the compiler must drop the whole import statement, or the runtime would try to load something that does not exist. `import type` makes that intent explicit:

```ts
import type { User } from './models.js';          // erased completely
import { createUser, type UserId } from './models.js'; // inline modifier: only UserId is erased
export type { User };                               // re-export a type only
```

A `type`-only import can only be used in type positions. Using it as a value is an error, which protects you from accidentally depending on runtime code.

### verbatimModuleSyntax

Historically the compiler guessed which imports were type-only ("import elision") and removed them. Single-file transpilers such as esbuild, SWC, Babel and Node's type stripping cannot guess, because they never look at other files. The modern answer is **`verbatimModuleSyntax`** (TypeScript 5.0+):

- imports and exports **without** `type` are always kept as written
- imports and exports **with** `type` are always removed
- importing a type without `type` is an error, so the problem is caught early

```ts
import { User } from './models.js';
// Error: 'User' is a type and must be imported using a type-only import
//        when 'verbatimModuleSyntax' is enabled.
```

It replaces the older flags `importsNotUsedAsValues` and `preserveValueImports` (both removed in TypeScript 5.5) and implies `isolatedModules`.

## Side-effect imports

`import './polyfills.js';` runs a module for its side effects. TypeScript 6.0 enables `noUncheckedSideEffectImports` by default, so a typo in such a path is now an error instead of being silently ignored.

## Import attributes and deferred imports

Non-JavaScript modules are imported with **import attributes**:

```ts
import config from './config.json' with { type: 'json' };
```

The older `assert { type: 'json' }` syntax is an error since TypeScript 6.0; write `with`. TypeScript 5.9 added `import defer * as heavy from './heavy.js'`, which loads a module but only evaluates it on first property access (requires `--module esnext` or `preserve`).

## Dynamic import

`await import('./chart.js')` loads a module on demand and returns a promise of its namespace, fully typed. Bundlers split it into a separate chunk. For a type-only reference to a module you have not imported, use an import type: `type Chart = import('./chart.js').Chart`.

## Legacy: CommonJS

Node's original module system uses `require` and `module.exports`. TypeScript has dedicated syntax for typing it:

```ts
import fs = require('fs');   // CommonJS import
export = createServer;        // CommonJS export
```

Both are TypeScript-only constructs that generate code, so they are rejected by `erasableSyntaxOnly` and Node's type stripping. Modern Node can `require()` ES modules and import CommonJS ones, so new code should be written as ESM. TypeScript 6.0 also locks `esModuleInterop` on, which makes `import express from 'express'` work for CommonJS packages.

## File extensions

Under `--module nodenext`, relative imports must include the extension of the **emitted** file: write `./math.js` even though the source is `math.ts`. Bundler setups (`moduleResolution: bundler`) allow extensionless imports. The module resolution lesson covers this in depth.

## Pitfalls

- Mixing default and named exports of the same thing confuses consumers. Many teams prefer named exports only.
- `export *` does not re-export the default export.
- Circular imports work in ESM but can observe uninitialised bindings (`ReferenceError: Cannot access 'x' before initialization`).
