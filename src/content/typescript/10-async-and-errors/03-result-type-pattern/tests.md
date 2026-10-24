## type: Checking ok narrows to value or error

```ts
const result = parseAge('42');
if (result.ok) {
  expectType<number>(result.value);
  // @ts-expect-error
  result.error;
} else {
  expectType<AgeError>(result.error);
  // @ts-expect-error
  result.value;
}
```

## type: Values cannot be read without narrowing

```ts
const result = parseAge('42');
// @ts-expect-error
const age: number = result.value;
const fromOk: Result<number, AgeError> = ok(1);
const fromErr: Result<number, AgeError> = err('empty');
// @ts-expect-error
const wrongError: Result<number, AgeError> = err('too-old');
```

## runtime: parseAge accepts valid ages

```js
assert.deepEqual(parseAge('42'), { ok: true, value: 42 });
assert.deepEqual(parseAge('  0 '), { ok: true, value: 0 });
assert.deepEqual(parseAge('150'), { ok: true, value: 150 });
```

## runtime: parseAge reports each error code

```js
assert.deepEqual(parseAge('   '), { ok: false, error: 'empty' });
assert.deepEqual(parseAge('abc'), { ok: false, error: 'not-a-number' });
assert.deepEqual(parseAge('12.5'), { ok: false, error: 'not-a-number' });
assert.deepEqual(parseAge('-1'), { ok: false, error: 'out-of-range' });
assert.deepEqual(parseAge('151'), { ok: false, error: 'out-of-range' });
```

## runtime: mapResult and unwrapOr compose results

```js
let calls = 0;
const double = (value) => { calls++; return value * 2; };
assert.deepEqual(mapResult(parseAge('21'), double), { ok: true, value: 42 });
assert.deepEqual(mapResult(parseAge('abc'), double), { ok: false, error: 'not-a-number' });
assert.equal(calls, 1, 'transform must not run for errors');
assert.equal(unwrapOr(parseAge('30'), -1), 30);
assert.equal(unwrapOr(parseAge(''), -1), -1);
```

## forbid: parseAge does not throw

```regex
\bthrow\b
```
