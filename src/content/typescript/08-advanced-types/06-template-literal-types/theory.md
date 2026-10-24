**Template literal types** (TypeScript 4.1) bring JavaScript's template string syntax to the type level.
They build string literal types out of other types:

```ts
type Greeting = `hello ${'world' | 'team'}`;
// 'hello world' | 'hello team'
```

## Cross products

When a placeholder holds a union, the result contains **every combination**. With several placeholders
you get the full cross product:

```ts
type Size = 'sm' | 'md' | 'lg';
type Tone = 'primary' | 'danger';

type ButtonClass = `btn-${Tone}-${Size}`;
// 'btn-primary-sm' | 'btn-primary-md' | ... (6 members)
```

Cross products grow fast: three unions of 10 members produce 1000 strings. TypeScript refuses to build
unions above 100,000 members, so keep the inputs small.

## Open-ended placeholders

Placeholders can also hold wide types such as `string`, `number` or `bigint`. The result is no longer a
finite union but a **pattern** that strings are checked against:

```ts
type CssPixels = `${number}px`;
type HexColor = `#${string}`;

const width: CssPixels = '120px';    // ok
const height: CssPixels = '1.5px';   // ok
// const bad: CssPixels = 'wide px'; // error
```

`${number}` accepts anything that `Number()` would parse back to the same text, such as `'1e3'` or `'-2'`.

## Intrinsic string manipulation types

Four built-in helpers transform string literal types. They are implemented inside the compiler
(`intrinsic`), not in TypeScript code:

```ts
type A = Uppercase<'save'>;      // 'SAVE'
type B = Lowercase<'SAVE'>;      // 'save'
type C = Capitalize<'save'>;     // 'Save'
type D = Uncapitalize<'Save'>;   // 'save'

type Handler<E extends string> = `on${Capitalize<E>}`;
type H = Handler<'click' | 'focus'>; // 'onClick' | 'onFocus'
```

## Pattern matching with infer

The most powerful use combines template literal types with `infer` to **parse** strings at compile time:

```ts
type SplitKey<K> = K extends `${infer Scope}:${infer Name}` ? [Scope, Name] : never;
type S = SplitKey<'user:created'>; // ['user', 'created']
```

Inference rules: each `infer` placeholder followed by a literal grabs the **shortest** text up to the next
occurrence of that literal; the last placeholder takes the rest. With `infer N extends number` the
captured text is turned into a numeric literal type:

```ts
type Port<U> = U extends `${string}:${infer P extends number}` ? P : never;
type P = Port<'localhost:8080'>; // 8080
```

## Typing runtime strings

A template string **expression** is normally typed as plain `string`. Since TypeScript 4.3 it keeps a
template literal type when it is **contextually typed** by one (for example by a declared return type), or
when you add `as const`:

```ts
function eventName<T extends string>(name: T): `${T}Changed` {
  return `${name}Changed`; // ok: checked against the declared return type
}

const id = 42;
const key = `user-${id}` as const; // 'user-42'
const loose = `user-${id}`;        // string
```

## Pitfalls

- Template literal types describe **strings only**: `${number}px` does not accept the number `12`.
- A placeholder with `string` makes the type match anything with that shape, including surprising values
  like `'#'` for `` `#${string}` `` (the empty string matches `string`).
- Huge unions slow the compiler down; prefer patterns (`${string}`) over enumerating every combination.
