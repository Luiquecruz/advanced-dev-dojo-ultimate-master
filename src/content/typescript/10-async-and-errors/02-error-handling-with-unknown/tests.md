## type: Signatures use unknown and ConfigError is an Error

```ts
type _ = [
  Expect<Equal<typeof getErrorMessage, (error: unknown) => string>>,
  Expect<Equal<ReturnType<typeof parseConfig>, AppConfig>>,
  Expect<Extends<ConfigError, Error>>,
];
new ConfigError('message', { cause: new Error('inner') });
```

## runtime: getErrorMessage handles errors, strings, message objects and the rest

```js
assert.equal(getErrorMessage(new TypeError('bad type')), 'bad type');
assert.equal(getErrorMessage('disk full'), 'disk full');
assert.equal(getErrorMessage({ message: 'from object' }), 'from object');
assert.equal(getErrorMessage({ message: 404 }), 'Unknown error');
assert.equal(getErrorMessage(null), 'Unknown error');
assert.equal(getErrorMessage(undefined), 'Unknown error');
```

## runtime: parseConfig returns valid configs

```js
assert.deepEqual(parseConfig('{"host":"localhost","port":8080}'), { host: 'localhost', port: 8080 });
```

## runtime: Invalid JSON throws a ConfigError with the SyntaxError as cause

```js
let caught;
try { parseConfig('{ host: '); } catch (error) { caught = error; }
assert.ok(caught instanceof ConfigError, 'expected a ConfigError');
assert.ok(caught instanceof Error);
assert.equal(caught.name, 'ConfigError');
assert.equal(caught.message, 'Invalid JSON');
assert.ok(caught.cause instanceof SyntaxError, 'expected the original SyntaxError as cause');
```

## runtime: Wrong shapes throw "Invalid config shape"

```js
assert.throws(() => parseConfig('{"host":"localhost","port":"8080"}'), 'Invalid config shape');
assert.throws(() => parseConfig('null'), 'Invalid config shape');
assert.throws(() => parseConfig('42'), ConfigError);
```

## forbid: Does not use any

```regex
\bany\b
```
