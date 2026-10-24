## type: Signatures accept the unions and reject other types

```ts
type _format = Expect<Equal<typeof formatId, (id: Id) => string>>;
type _tags = Expect<Equal<typeof normalizeTags, (input: string | string[]) => string[]>>;
// @ts-expect-error
formatId(true);
// @ts-expect-error
normalizeTags([1, 2]);
```

## runtime: formatId pads numbers and uppercases strings

```js
assert.equal(formatId(42), '000042'); assert.equal(formatId(1234567), '1234567'); assert.equal(formatId(' ab-7 '), 'AB-7');
```

## runtime: normalizeTags splits strings by commas

```js
assert.deepEqual(normalizeTags('a, b,,c'), ['a', 'b', 'c']); assert.deepEqual(normalizeTags(''), []);
```

## runtime: normalizeTags cleans arrays

```js
assert.deepEqual(normalizeTags([' sale ', '', 'new']), ['sale', 'new']);
```

## runtime: totalQuantity sums numbers and numeric strings

```js
assert.equal(totalQuantity([1, '2', 3]), 6); assert.equal(totalQuantity([]), 0); assert.equal(totalQuantity(['10', '5']), 15);
```
