When a conditional type checks a **naked type parameter** and that parameter is instantiated with a
**union**, TypeScript does not check the union as a whole. It applies the conditional type to **each
member separately** and unions the results. This is called **distribution**:

```ts
type ToArray<T> = T extends unknown ? T[] : never;

type A = ToArray<string | number>;
// = ToArray<string> | ToArray<number>
// = string[] | number[]
```

*Naked* means the type parameter appears alone on the left of `extends`, not wrapped in a tuple, array,
object or other type.

## Why it is useful: filtering unions

Distribution turns conditional types into a `filter`/`map` over union members. Returning `never` for a
member removes it, because `X | never` is just `X`. This is exactly how the built-in helpers work:

```ts
type MyExclude<T, U> = T extends U ? never : T;
type MyExtract<T, U> = T extends U ? T : never;

type Status = 'idle' | 'loading' | 'success' | 'error';
type Busy = MyExclude<Status, 'idle'>;            // 'loading' | 'success' | 'error'
type Done = MyExtract<Status, 'success' | 'error'>; // 'success' | 'error'
```

Distribution also works over discriminated unions, which makes it easy to pick variants:

```ts
type Event =
  | { type: 'click'; x: number; y: number }
  | { type: 'key'; key: string };

type KeyEvent = Extract<Event, { type: 'key' }>; // { type: 'key'; key: string }
```

## Turning distribution off

Sometimes you want to treat the union as one unit. Wrap both sides of `extends` in a one-element tuple, so
the type parameter is no longer naked:

```ts
type ToArrayAll<T> = [T] extends [unknown] ? T[] : never;

type B = ToArrayAll<string | number>; // (string | number)[]
```

## The `never` surprise

`never` is the **empty union**. Distributing over zero members produces zero results, so a distributive
conditional type applied to `never` is always `never`, no matter what the branches say:

```ts
type IsNeverBroken<T> = T extends never ? true : false;
type X = IsNeverBroken<never>; // never, not true!

type IsNever<T> = [T] extends [never] ? true : false;
type Y = IsNever<never>; // true
```

## The `boolean` surprise

`boolean` is the union `true | false`, so it distributes as well:

```ts
type Box<T> = T extends unknown ? { value: T } : never;
type C = Box<boolean>; // { value: false } | { value: true }
```

## Detecting unions

Combining both modes lets you ask whether a type is a union: distribute over `T`, and inside each branch
compare the **original** type (captured in a second parameter) with the single member. Only a union has a
member that is not equal to the whole:

```ts
type IsUnion<T, All = T> =
  [T] extends [never] ? false :
  T extends unknown ? ([All] extends [T] ? false : true) : never;
```

## Rules to remember

- Only **naked type parameters** distribute. `T[] extends ...`, `[T] extends ...` and
  `keyof T extends ...` do not.
- Distribution happens on **instantiation**, so a type alias that receives an already-written union in its
  body (`'a' | 'b' extends string ? ...`) does not distribute.
- `never` in, `never` out: guard with `[T] extends [never]` before distributing when `never` needs a
  real answer.
