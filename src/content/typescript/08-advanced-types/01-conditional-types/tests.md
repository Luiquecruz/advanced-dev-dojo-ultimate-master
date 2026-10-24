## type: If picks the branch that matches the condition

```ts
type _ = [
  Expect<Equal<If<true, 'yes', 'no'>, 'yes'>>,
  Expect<Equal<If<false, 'yes', 'no'>, 'no'>>,
  Expect<Equal<If<true, string[], number>, string[]>>,
];
// @ts-expect-error
type Rejected = If<'yes', 1, 2>;
```

## type: IsString checks assignability to string

```ts
type _ = [
  Expect<Equal<IsString<string>, true>>,
  Expect<Equal<IsString<'literal'>, true>>,
  Expect<Equal<IsString<`id-${number}`>, true>>,
  Expect<Equal<IsString<42>, false>>,
  Expect<Equal<IsString<string[]>, false>>,
];
```

## type: TypeName mirrors the typeof operator

```ts
type _ = [
  Expect<Equal<TypeName<'a'>, 'string'>>,
  Expect<Equal<TypeName<3.14>, 'number'>>,
  Expect<Equal<TypeName<true>, 'boolean'>>,
  Expect<Equal<TypeName<undefined>, 'undefined'>>,
  Expect<Equal<TypeName<(id: number) => string>, 'function'>>,
  Expect<Equal<TypeName<{ id: number }>, 'object'>>,
  Expect<Equal<TypeName<null>, 'object'>>,
];
```

## type: Flatten unwraps exactly one array level

```ts
type _ = [
  Expect<Equal<Flatten<string[]>, string>>,
  Expect<Equal<Flatten<readonly number[]>, number>>,
  Expect<Equal<Flatten<[1, 'a']>, 1 | 'a'>>,
  Expect<Equal<Flatten<string[][]>, string[]>>,
  Expect<Equal<Flatten<Date>, Date>>,
];
```

## type: typeName returns a precise TypeName

```ts
const text = typeName('hello');
const count = typeName(10);
type _ = [
  Expect<Equal<typeof text, 'string'>>,
  Expect<Equal<typeof count, 'number'>>,
];
```

## runtime: typeName returns the runtime typeof string

```js
assert.equal(typeName('a'), 'string');
assert.equal(typeName(1), 'number');
assert.equal(typeName(false), 'boolean');
assert.equal(typeName(undefined), 'undefined');
assert.equal(typeName(() => 1), 'function');
assert.equal(typeName(null), 'object');
assert.equal(typeName({}), 'object');
```

## forbid: Does not use any

```regex
\bany\b
```
