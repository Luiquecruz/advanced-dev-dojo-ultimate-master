## type: invariant asserts its condition

```ts
type _ = Expect<Equal<typeof invariant, (condition: unknown, message: string) => asserts condition>>;
const value: string | undefined = Math.random() > 2 ? undefined : 'x';
invariant(value !== undefined, 'missing');
const text: string = value;
```

## type: assertIsString narrows the value after the call

```ts
type _ = Expect<Equal<typeof assertIsString, (value: unknown, name: string) => asserts value is string>>;
const input: unknown = 'hello';
assertIsString(input, 'input');
const upper: string = input.toUpperCase();
```

## runtime: invariant throws only for falsy conditions

```js
invariant(true, 'never'); invariant(1, 'never'); assert.throws(() => invariant(false, 'boom'), 'boom'); assert.throws(() => invariant(0, 'zero'), Error);
```

## runtime: assertIsString throws a TypeError with the name

```js
assertIsString('ok', 'host'); assert.throws(() => assertIsString(42, 'host'), TypeError); assert.throws(() => assertIsString(undefined, 'path'), 'path must be a string');
```

## runtime: readConfig validates host and port

```js
assert.deepEqual(readConfig({ host: 'localhost', port: 8080 }), { host: 'localhost', port: 8080 }); assert.throws(() => readConfig({ host: 42, port: 8080 }), 'host must be a string'); assert.throws(() => readConfig({ host: 'localhost', port: -1 }), 'port must be a positive number'); assert.throws(() => readConfig({ host: 'localhost', port: '80' }), 'port must be a positive number');
```

## forbid: Does not use type assertions

```regex
\bas\s+\w
```
