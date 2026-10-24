A **recursive type** refers to itself in its own definition. Real data is full of recursion: JSON,
file systems, comment threads, menus, ASTs. TypeScript can describe all of them.

## Recursive data shapes

The classic example is JSON. A JSON value is a primitive, an array of JSON values or an object whose
values are JSON values:

```ts
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const config: JsonValue = { name: 'app', ports: [80, 443], tls: { enabled: true } };
// const bad: JsonValue = { createdAt: new Date() }; // error: Date is not JSON
```

Interfaces and generic types recurse just as easily:

```ts
interface MenuItem {
  label: string;
  children: MenuItem[];
}

type LinkedList<T> = { value: T; next: LinkedList<T> | null };
```

### Legacy vs modern

Before TypeScript 3.7, a type **alias** could not reference itself directly inside a union. The workaround
was an interface "trampoline":

```ts
type LegacyJson = string | number | boolean | null | JsonArray | JsonObject;
interface JsonArray extends Array<LegacyJson> {}
interface JsonObject { [key: string]: LegacyJson }
```

You will still find this pattern in older declaration files. Since 3.7, the direct version works because
references inside arrays, tuples and object types are resolved lazily.

## Recursive conditional types

Since TypeScript 4.1, conditional types can call themselves. That turns them into loops:

```ts
type DeepAwaited<T> = T extends Promise<infer V> ? DeepAwaited<V> : T;
type A = DeepAwaited<Promise<Promise<string>>>; // string

type TrimStart<S extends string> = S extends ` ${infer Rest}` ? TrimStart<Rest> : S;
type B = TrimStart<'   hi'>; // 'hi'
```

Every recursive type needs a **base case** (the false branch above), exactly like a recursive function.

## Recursion limits

The compiler protects itself against infinite types. When an instantiation chain gets too deep you see:

> Type instantiation is excessively deep and possibly infinite.

- Ordinary recursion hits the **instantiation depth limit of 100** nested instantiations, which in
  practice means a few dozen levels of a recursive conditional type.
- Since TypeScript 4.5, **tail-recursive** conditional types (the recursive call is the whole branch result,
  not wrapped in another type) are evaluated in a loop and can go up to **1000** iterations.

```ts
// Not tail recursive: the recursive call is wrapped in a tuple spread
type Repeat<S, N extends number, Acc extends unknown[] = []> =
  Acc['length'] extends N ? [] : [S, ...Repeat<S, N, [...Acc, S]>];

// Tail recursive: carry the result in an accumulator
type RepeatTail<S, N extends number, Acc extends unknown[] = []> =
  Acc['length'] extends N ? Acc : RepeatTail<S, N, [...Acc, S]>;
```

The **accumulator** pattern (an extra parameter with a default) is the standard way to make type-level
loops tail recursive.

## Typing recursive functions

Recursive types pair naturally with recursive functions. The type describes the shape; the function walks
it:

```ts
function countItems(items: MenuItem[]): number {
  return items.reduce((total, item) => total + 1 + countItems(item.children), 0);
}
```

## Pitfalls

- A recursive alias with no structure around the reference (`type Loop = Loop`) is an error: there must be
  something to unfold.
- Recursion over **wide** types such as `string` or `number[]` usually hits the base case immediately; test
  your helpers with literal types and tuples.
- Deep recursion slows editors down. Keep recursive helpers focused, and prefer tail recursion for long
  inputs.
