## Enums

An `enum` is one of the few TypeScript features that **generates JavaScript**. It declares a named set of constants that exists both as a type and as an object at runtime.

```ts
enum Direction { Up, Down, Left, Right }       // numeric: 0, 1, 2, 3
enum LogLevel { Info = 'info', Error = 'error' } // string enum

Direction.Up;      // 0
Direction[0];      // "Up"  numeric enums get a reverse mapping
LogLevel.Error;    // "error"
```

The compiled output of `Direction` is an IIFE that builds an object with both directions of the mapping. That runtime cost and shape surprise many people the first time they read the emitted code.

### Behaviour you need to know

- **Numeric enums are loosely typed.** Any `number` value is assignable to a numeric enum type, so `const d: Direction = someNumber` compiles. Since TypeScript 5.0, only out-of-range *literals* like `Direction = 7` are rejected.
- **String enums are nominal.** A string literal is *not* assignable to a string enum, even when it matches a member's value:

```ts
function log(level: LogLevel) { /* ... */ }
log(LogLevel.Error); // ok
log('error');        // Error: '"error"' is not assignable to parameter of type 'LogLevel'
```

That forces every caller, including JSON coming from an API, to import the enum or cast.

### `const enum`

`const enum` members are **inlined** at compile time and no object is emitted. It sounds like a free optimization, but tools that compile one file at a time (esbuild, Babel, SWC, `isolatedModules`) cannot inline values declared in another file, so `const enum` across modules is fragile and is discouraged in libraries.

## `erasableSyntaxOnly` and type stripping

Modern runtimes and tools increasingly run TypeScript by **stripping types**: Node.js does it by default since v23.6 (and v22.18), and bundlers do the same. Stripping only works for syntax that can be deleted without changing behavior. Enums, namespaces with values and constructor parameter properties need code generation, so they cannot be stripped.

TypeScript 5.8 added the `erasableSyntaxOnly` compiler option, which reports an error for that non-erasable syntax:

```json
{ "compilerOptions": { "erasableSyntaxOnly": true } }
```

```ts
enum Status { Active } // Error: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
```

## The modern alternative: union types

For most enums a **union of string literals** does the job with zero runtime code:

```ts
type LogLevel = 'info' | 'error';
log('error'); // ok, plain strings work everywhere, including parsed JSON
```

When you also want a runtime object (to iterate, to get autocomplete through `LogLevel.Error`, or to keep call sites that already use that syntax), combine an `as const` object with a derived union of the **same name**. A value and a type can share a name because they live in different namespaces:

```ts
const LogLevel = {
  Info: 'info',
  Error: 'error',
} as const;

type LogLevel = (typeof LogLevel)[keyof typeof LogLevel]; // "info" | "error"

log(LogLevel.Error); // still works
log('error');        // now works too
Object.values(LogLevel); // ["info", "error"]
```

## Choosing

| Need | Use |
| --- | --- |
| Closed set of strings, no runtime object | `type X = 'a' \| 'b'` |
| Runtime object + type, erasable | `as const` object + derived union |
| Existing codebase or bit flags with numeric enums | `enum` (legacy, still supported) |
| Project with `erasableSyntaxOnly` or Node type stripping | anything but `enum` |

Enums are not deprecated and you will meet them in older code and in frameworks, so you need to read them. For new code, unions are simpler, structurally typed and friendlier to type stripping.
