## type: TrimStart removes any mix of leading whitespace

```ts
type _ = [
  Expect<Equal<TrimStart<'   hello'>, 'hello'>>,
  Expect<Equal<TrimStart<'\n\t  value  '>, 'value  '>>,
  Expect<Equal<TrimStart<'clean'>, 'clean'>>,
  Expect<Equal<TrimStart<''>, ''>>,
];
```

## type: ReplaceAll replaces every occurrence exactly once

```ts
type _ = [
  Expect<Equal<ReplaceAll<'a-b-c', '-', '_'>, 'a_b_c'>>,
  Expect<Equal<ReplaceAll<'foobarfoo', 'foo', 'x'>, 'xbarx'>>,
  Expect<Equal<ReplaceAll<'aa', 'a', 'aa'>, 'aaaa'>>,
  Expect<Equal<ReplaceAll<'keep', '', 'x'>, 'keep'>>,
  Expect<Equal<ReplaceAll<'none', 'z', 'y'>, 'none'>>,
];
```

## type: Split behaves like String.prototype.split

```ts
type _ = [
  Expect<Equal<Split<'a,b,c', ','>, ['a', 'b', 'c']>>,
  Expect<Equal<Split<'2024-01-31', '-'>, ['2024', '01', '31']>>,
  Expect<Equal<Split<'abc', ','>, ['abc']>>,
  Expect<Equal<Split<'', ','>, ['']>>,
  Expect<Equal<Split<'a::b', '::'>, ['a', 'b']>>,
];
```

## type: KebabToCamel converts naming conventions

```ts
type _ = [
  Expect<Equal<KebabToCamel<'background-color'>, 'backgroundColor'>>,
  Expect<Equal<KebabToCamel<'is-very-long'>, 'isVeryLong'>>,
  Expect<Equal<KebabToCamel<'plain'>, 'plain'>>,
];
```

## type: StringLength counts characters

```ts
type _ = [
  Expect<Equal<StringLength<''>, 0>>,
  Expect<Equal<StringLength<'hey'>, 3>>,
  Expect<Equal<StringLength<'type-level programming'>, 22>>,
];
```

## type: kebabToCamel returns a precise type

```ts
const key = kebabToCamel('font-size');
type _ = Expect<Equal<typeof key, 'fontSize'>>;
```

## runtime: kebabToCamel converts at runtime

```js
assert.equal(kebabToCamel('background-color'), 'backgroundColor');
assert.equal(kebabToCamel('is-very-long'), 'isVeryLong');
assert.equal(kebabToCamel('plain'), 'plain');
```
