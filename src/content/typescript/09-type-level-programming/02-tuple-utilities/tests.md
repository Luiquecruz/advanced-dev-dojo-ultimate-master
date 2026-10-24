## type: TupleToUnion returns the union of elements

```ts
const sizes = ['sm', 'md', 'lg'] as const;
type _ = [
  Expect<Equal<TupleToUnion<[1, 'a', true]>, 1 | 'a' | true>>,
  Expect<Equal<TupleToUnion<typeof sizes>, 'sm' | 'md' | 'lg'>>,
  Expect<Equal<TupleToUnion<[]>, never>>,
];
```

## type: First and Last pick the edges

```ts
type _ = [
  Expect<Equal<First<[3, 2, 1]>, 3>>,
  Expect<Equal<First<readonly ['a', 'b']>, 'a'>>,
  Expect<Equal<First<[undefined, 1]>, undefined>>,
  Expect<Equal<First<[]>, never>>,
  Expect<Equal<Last<[3, 2, 1]>, 1>>,
  Expect<Equal<Last<readonly ['a', 'b']>, 'b'>>,
  Expect<Equal<Last<[]>, never>>,
];
```

## type: Length returns a number literal

```ts
const tuple = [1, 2, 3, 4] as const;
type _ = [
  Expect<Equal<Length<[]>, 0>>,
  Expect<Equal<Length<['a', 'b']>, 2>>,
  Expect<Equal<Length<typeof tuple>, 4>>,
];
// @ts-expect-error
type NotATuple = Length<'abc'>;
```

## type: Reverse flips the order

```ts
type _ = [
  Expect<Equal<Reverse<[1, 2, 3]>, [3, 2, 1]>>,
  Expect<Equal<Reverse<readonly ['a', 'b']>, ['b', 'a']>>,
  Expect<Equal<Reverse<[]>, []>>,
];
```

## type: last returns the precise type of the last item

```ts
const value = last([1, 'two', true]);
const empty = last([]);
type _ = [
  Expect<Equal<typeof value, true>>,
  Expect<Equal<typeof empty, never>>,
];
```

## runtime: last returns the last item

```js
assert.equal(last([1, 'two', true]), true);
assert.equal(last(['only']), 'only');
assert.equal(last([]), undefined);
```
