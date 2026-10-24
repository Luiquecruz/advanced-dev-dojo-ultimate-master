## type: first and last keep the element type

```ts
const numbers: readonly number[] = [1, 2];
const head = first(numbers);
const tail = last(['a', 'b']);
type _ = [
  Expect<Equal<typeof head, number | undefined>>,
  Expect<Equal<typeof tail, string | undefined>>,
];
```

## type: zip returns typed tuples

```ts
const pairs = zip([1, 2, 3], ['a', 'b']);
type _ = Expect<Equal<typeof pairs, [number, string][]>>;
```

## type: compose infers the composed function type

```ts
const isLong = compose((text: string) => text.length, (length) => length > 3);
type _ = Expect<Equal<typeof isLong, (input: string) => boolean>>;
// @ts-expect-error the input must be a string
isLong(42);
```

## runtime: first and last handle empty arrays

```js
assert.equal(first([1, 2, 3]), 1);
assert.equal(last([1, 2, 3]), 3);
assert.equal(first([]), undefined);
assert.equal(last([]), undefined);
```

## runtime: zip stops at the shorter array and compose chains calls

```js
assert.deepEqual(zip([1, 2, 3], ['a', 'b']), [[1, 'a'], [2, 'b']]);
assert.deepEqual(zip([], [1]), []);
const shout = compose((text) => text.toUpperCase(), (text) => text + '!');
assert.equal(shout('hi'), 'HI!');
```

## forbid: Does not use any

```regex
\bany\b
```
