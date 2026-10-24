Type parameters can have **defaults**, just like function parameters. A default is used when the type
argument is neither written explicitly nor inferable.

```ts
interface ApiPage<TItem, TCursor = number> {
  items: TItem[];
  next: TCursor | null;
}

type UserPage = ApiPage<User>;              // TCursor = number
type FeedPage = ApiPage<Post, string>;      // TCursor = string
```

Without the default, every use site would have to repeat `ApiPage<User, number>`.

## Rules

- Parameters with defaults must come **after** required ones: `<A, B = string>` is fine, `<A = string, B>`
  is an error.
- A default may reference earlier parameters: `<T, TList = T[]>`.
- A default must satisfy the parameter's constraint: `<T extends object = {}>`.
- Types with all parameters defaulted can be used bare: `type R = Result;`.

## Defaults vs inference in functions

For generic functions, **inference wins**. The default only applies when there is no inference site:

```ts
function createList<T = string>(...items: T[]): T[] {
  return items;
}

createList(1, 2);   // number[]  (inferred from the arguments)
createList();       // string[]  (nothing to infer: default)
```

Without the default, `createList()` would be `unknown[]`. Inference can also come from the **expected
return type**:

```ts
function failure<TData = never>(message: string): Result<TData> { ... }

const a = failure('boom');                   // Result<never>: default
const b: Result<number> = failure('boom');   // Result<number>: inferred from the annotation
```

## Pitfall: a default is not a constraint

`<T = string>` only picks `string` when nothing else is known; callers may still pass a number. If the
parameter must be a string, write `<T extends string = string>`.

## Pitfall: no partial inference

When you pass type arguments explicitly, you must pass **every** parameter that has no default. TypeScript
does not infer the rest:

```ts
function convert<TInput, TOutput>(value: TInput, fn: (value: TInput) => TOutput): TOutput { ... }

convert<number>(1, String); // error: Expected 2 type arguments, but got 1.
```

Defaults are a way to design APIs that allow partial specification: put the parameters users usually write
first, and give the rest sensible defaults.

## Where you meet defaults

- React's argument-less overload `useState<S = undefined>()` returns `[S | undefined, ...]`, so
  `useState()` alone is typed as holding `undefined`.
- Error types are a classic default: `Result<T, E = Error>`, so most code only names the success type.
