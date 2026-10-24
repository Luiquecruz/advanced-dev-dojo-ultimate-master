## runtime: toTimestamp handles dates, numbers and strings

```js
assert.equal(toTimestamp(new Date(1000)), 1000); assert.equal(toTimestamp(2500), 2500); assert.equal(toTimestamp('1970-01-01T00:00:01.000Z'), 1000);
```

## runtime: describeError narrows unknown values

```js
assert.equal(describeError(new TypeError('bad input')), 'bad input'); assert.equal(describeError('timeout'), 'timeout'); assert.equal(describeError(404), 'Unknown error'); assert.equal(describeError(null), 'Unknown error');
```

## runtime: area tells circles from squares

```js
assert.equal(area({ side: 3 }), 9); assert.equal(area({ radius: 1 }), Math.PI);
```

## pattern: Uses instanceof and the in operator

```regex
instanceof\s+Date[\s\S]*['"]\w+['"]\s+in\s+\w+|['"]\w+['"]\s+in\s+\w+[\s\S]*instanceof\s+Date
```

## forbid: Does not use type assertions

```regex
\bas\s+\w
```
