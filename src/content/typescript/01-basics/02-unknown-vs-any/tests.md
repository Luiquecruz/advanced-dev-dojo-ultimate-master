## type: Signature is (value: unknown) => string

```ts
type _ = Expect<Equal<typeof describeValue, (value: unknown) => string>>;
```

## runtime: Describes strings

```js
assert.equal(describeValue("hey"), "text(3)"); assert.equal(describeValue(""), "text(0)");
```

## runtime: Describes numbers

```js
assert.equal(describeValue(21), "number(42)");
```

## runtime: Falls back to "other"

```js
assert.equal(describeValue(null), "other"); assert.equal(describeValue({}), "other");
```

## forbid: Does not use any

```regex
\bany\b
```
