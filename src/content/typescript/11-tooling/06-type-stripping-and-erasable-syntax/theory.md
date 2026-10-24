## Running TypeScript without compiling

Types have no effect at runtime, so the simplest way to run TypeScript is to **delete them**. That is **type stripping**: replace every annotation, interface and `type` alias with whitespace and execute what remains as JavaScript.

```ts
// input
function total(prices: number[]): number {
  return prices.reduce((sum, price) => sum + price, 0);
}

// what the runtime executes (types blanked out, positions preserved)
function total(prices           )         {
  return prices.reduce((sum, price) => sum + price, 0);
}
```

Because positions do not move, stack traces point to the right lines without source maps. Node.js runs `.ts` files this way out of the box: stripping was enabled by default in Node 23.6 (backported to 22.18) and marked stable in late 2025.

```bash
node server.ts
```

Deno and Bun run TypeScript natively as well, and esbuild, SWC, oxc and Babel have always worked per file in a similar spirit.

**Stripping never type checks.** Keep `tsc --noEmit` (or TypeScript 7's much faster `tsc`) in your editor and CI.

## Erasable vs non-erasable syntax

Most TypeScript syntax is **erasable**: removing it leaves valid JavaScript with the same behavior. A few older features **generate code**, so they cannot simply be deleted:

| Not erasable | Why | Erasable alternative |
| --- | --- | --- |
| `enum` / `const enum` | emits an object (const enums inline values across files) | `as const` object + union type |
| `namespace` with values | emits an IIFE | ES modules |
| constructor parameter properties | emit `this.x = x` assignments | declare fields explicitly |
| `import x = require()` / `export =` | emit CommonJS code | ESM `import` / `export` |
| `<Type>value` assertions | ambiguous with JSX and generic syntax | `value as Type` |

Type-only namespaces (`namespace Shapes { export type Point = ... }`) and `declare enum` are fine because they emit nothing.

### The erasableSyntaxOnly flag

TypeScript 5.8 added `--erasableSyntaxOnly`, which reports every non-erasable construct with `TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.`

```ts
enum Status { Active, Archived }             // TS1294
class Point { constructor(public x: number) {} } // TS1294

const Status = { Active: 'active', Archived: 'archived' } as const;
type Status = (typeof Status)[keyof typeof Status];

class Point {
  x: number;
  constructor(x: number) {
    this.x = x;
  }
}
```

## A tsconfig for type-stripped code

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "noEmit": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "allowImportingTsExtensions": true
  }
}
```

- `verbatimModuleSyntax` forces `import type` for types. A stripper cannot know whether `import { User }` is a type, so it would leave a runtime import of something that does not exist.
- Relative imports name the real file, `./user.ts`. When you also publish compiled JavaScript, `rewriteRelativeImportExtensions` turns `.ts` specifiers into `.js` on emit.
- Node ignores `tsconfig.json`: `paths` aliases do not work at runtime. Use `package.json` `"imports"` (`#/*`) instead.

## Node's limits

- `.tsx` files are not supported.
- Files inside `node_modules` are never stripped; publish JavaScript plus `.d.ts` files.
- Non-erasable syntax throws `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`. The separate `--experimental-transform-types` flag transforms enums and namespaces, but code written for `erasableSyntaxOnly` does not need it.

## The bigger picture

TC39's **Type Annotations** proposal (Stage 1) explores letting JavaScript engines themselves ignore type syntax, the same idea standardised. Whether or not it advances, the ecosystem has converged: write erasable TypeScript, let fast tools strip it, and let the type checker run separately.

## Legacy vs modern

| Before | Now |
| --- | --- |
| `ts-node`, `tsc` then `node dist/` | `node file.ts` |
| enums, namespaces, parameter properties | `as const` objects, modules, explicit fields |
| import elision guessed by the compiler | explicit `import type` |

## Pitfalls

- Mixing `enum`s into a codebase that runs through Node stripping fails only when that file is loaded. Enable `erasableSyntaxOnly` to catch it at compile time.
- Decorators are not handled by stripping: legacy `experimentalDecorators` need a compile step (NestJS, TypeORM, older Angular code), and standard decorators run only where the engine supports them natively.
