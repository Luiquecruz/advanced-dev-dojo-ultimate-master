Template literal types with `infer` turn string literal types into something you can **parse and
rewrite** at compile time. Libraries rely on this for typed routes (`'/users/:id'` → `{ id: string }`),
typed CSS-in-JS, i18n keys and SQL builders. This lesson collects the core techniques.

## How string inference matches

Given `S extends `${infer A}${Sep}${infer B}``:

- `A` takes the **shortest** prefix that is followed by `Sep` (the first occurrence).
- The last placeholder, `B`, takes **everything** that remains.
- Two placeholders next to each other (`${infer Head}${infer Rest}`) split off a **single character**:
  `Head` gets one character and `Rest` the remainder.

```ts
type FirstWord<S> = S extends `${infer W} ${string}` ? W : S;
type W = FirstWord<'hello big world'>; // 'hello'

type FirstChar<S> = S extends `${infer C}${string}` ? C : never;
type C = FirstChar<'abc'>; // 'a'
```

## Loops over strings

Recursion turns a single match into a loop. Each step consumes part of the string and recurses on the rest:

```ts
type RemoveDashes<S extends string> = S extends `${infer L}-${infer R}`
  ? `${L}${RemoveDashes<R>}`
  : S;

type R = RemoveDashes<'2024-01-31'>; // '20240131'
```

Note that the recursion runs on `R` (the unprocessed rest), never on the already rewritten output. If you
recursed on the whole result, replacing `'a'` with `'aa'` would never terminate.

## Matching a set of characters

The pattern can contain a **union**, which matches any of its members:

```ts
type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
type StripLeadingDigits<S> = S extends `${Digit}${infer Rest}` ? StripLeadingDigits<Rest> : S;

type S = StripLeadingDigits<'42abc'>; // 'abc'
```

## Producing tuples

Strings can be parsed into tuples by accumulating results, which also gives you a way to measure them:

```ts
type Chars<S extends string> = S extends `${infer Head}${infer Rest}` ? [Head, ...Chars<Rest>] : [];
type Len = Chars<'hey'>['length']; // 3
```

`string['length']` exists at the value level, but at the type level `'hey'['length']` is just `number`.
Counting has to go through a tuple.

## Case conversion

Combine pattern matching with the intrinsic helpers to change naming conventions:

```ts
type SnakeToPascal<S extends string> = S extends `${infer Word}_${infer Rest}`
  ? `${Capitalize<Word>}${SnakeToPascal<Rest>}`
  : Capitalize<S>;

type P = SnakeToPascal<'user_id_field'>; // 'UserIdField'
```

## Typing the runtime twin

Pairing a type-level transformation with a runtime function gives callers precise results:

```ts
function snakeToPascal<S extends string>(value: S) {
  return value.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('') as SnakeToPascal<S>;
}
```

The assertion is the price of admission: the compiler cannot prove that `split`/`map`/`join` implement the
same algorithm as the type. Keep both versions small and test them together.

## Pitfalls

- Wide inputs short-circuit: `SnakeToPascal<string>` cannot be parsed and usually returns something vague
  like `Capitalize<string>`.
- An empty separator (`${infer L}${''}${infer R}`) matches between every character; guard against `''`
  explicitly when it is a valid input.
- Long strings hit recursion limits. Prefer tail-recursive versions with an accumulator for input that may
  exceed a few dozen characters.
