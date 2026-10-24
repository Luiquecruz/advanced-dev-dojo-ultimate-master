## Optional parameters

Add `?` after a parameter name to make it optional. Inside the function its type includes `undefined`, so you must handle the missing case:

```ts
function formatName(first: string, last?: string): string {
  return last ? `${first} ${last}` : first;   // last: string | undefined
}

formatName('Ada');               // "Ada"
formatName('Ada', 'Lovelace');   // "Ada Lovelace"
```

Optional parameters must come **after** all required ones.

`last?: string` is not the same as `last: string | undefined`: the second form is still *required*, the caller must explicitly pass `undefined`.

## Default parameters

A default value makes the parameter optional for callers and **removes** `undefined` inside the body. The type is inferred from the default:

```ts
function repeat(text: string, times = 2, separator = ' '): string {
  return Array.from({ length: times }, () => text).join(separator);
}

repeat('ha');            // "ha ha"
repeat('ha', 3, '-');    // "ha-ha-ha"
repeat('ha', undefined, '+'); // "ha+ha", undefined triggers the default
```

### Legacy vs modern

Before ES2015, defaults were written with `||` inside the body:

```js
function repeat(text, times, separator) {
  times = times || 2;           // bug: repeat('ha', 0) repeats twice
  separator = separator || ' '; // bug: repeat('ha', 2, '') uses a space
}
```

Default parameters only kick in for `undefined`, so `0`, `''` and `false` are respected. Prefer them over manual fallbacks.

## Rest parameters

A **rest parameter** collects any number of remaining arguments into an array. It must be last, and its type is an array (or tuple) type:

```ts
function sum(...values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

sum();          // 0
sum(1, 2, 3);   // 6

function log(level: 'info' | 'error', ...parts: string[]) { /* ... */ }
```

To call a rest function with an existing array, spread it: `sum(...prices)`.

### Legacy: the `arguments` object

Old JavaScript read extra arguments through `arguments`, an array-like object (not a real array: no `map` or `reduce`) that does not exist in arrow functions. In TypeScript it is worse: the function's declared signature has no parameters, so `sum(1, 2)` is a type error, and every element of `arguments` is `any`. Rest parameters replaced it completely.

## Tuple rest parameters and spreading

A rest parameter can be typed with a tuple to describe an exact argument list:

```ts
function move(...point: [x: number, y: number]) { /* ... */ }

const origin = [0, 0] as const;
move(...origin);   // ok, the tuple length is known

const values = [0, 0];
move(...values);   // Error: A spread argument must either have a tuple type or be passed to a rest parameter
```

`values` is a `number[]` of unknown length, so the compiler cannot prove it has exactly two elements. A tuple annotation or `as const` fixes that.

## Pitfalls

- A default parameter placed *before* a required one is not optional for callers; they must pass `undefined` explicitly. Keep defaults at the end.
- `function f(options = {})` infers `{}` as the type; annotate it (`options: Options = {}`).
- Optional parameters in **callback types** are a different topic: they usually make callbacks harder to write (see the higher-order functions lesson).
