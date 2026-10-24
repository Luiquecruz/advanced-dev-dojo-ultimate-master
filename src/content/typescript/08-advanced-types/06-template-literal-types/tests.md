## type: CssLength accepts a number followed by a unit

```ts
let length: CssLength = '12px';
length = '1.5rem';
length = '100%';
// @ts-expect-error
length = '12em';
// @ts-expect-error
length = 'widepx';
// @ts-expect-error
length = '12';
```

## type: ChangeEvent derives event names from string keys

```ts
const secret = Symbol('secret');
type Form = { name: string; age: number; [secret]: boolean };
type _ = [
  Expect<Equal<ChangeEvent<Form>, 'nameChanged' | 'ageChanged'>>,
  Expect<Equal<ChangeEvent<{}>, never>>,
];
```

## type: ParseVersion parses semantic versions

```ts
type _ = [
  Expect<Equal<ParseVersion<'1.20.3'>, { major: 1; minor: 20; patch: 3 }>>,
  Expect<Equal<ParseVersion<'0.0.1'>, { major: 0; minor: 0; patch: 1 }>>,
];
```

## type: ParseVersion rejects malformed versions

```ts
type _ = [
  Expect<Equal<ParseVersion<'1.2'>, never>>,
  Expect<Equal<ParseVersion<'one.two.three'>, never>>,
  Expect<Equal<ParseVersion<42>, never>>,
];
```

## type: toPx returns a precise template literal type

```ts
const twelve = toPx(12);
type _ = Expect<Equal<typeof twelve, '12px'>>;
const asLength: CssLength = toPx(4);
```

## runtime: toPx appends px

```js
assert.equal(toPx(12), '12px');
assert.equal(toPx(0.5), '0.5px');
```
