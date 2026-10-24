## type: File handles are disposable

```ts
const handle: Disposable = openFile('notes.txt', []);
type _ = Expect<Extends<FileHandle, Disposable>>;
```

## runtime: openFile logs "close <path>" when disposed

```js
const log = [];
const file = openFile('notes.txt', log);
file.write('hello');
file[Symbol.dispose]();
assert.deepEqual(log, ['open notes.txt', 'write hello', 'close notes.txt']);
```

## runtime: exportReport releases resources in reverse order

```js
const log = [];
assert.equal(await exportReport(log, 'SELECT name FROM users'), 2);
assert.deepEqual(log, ['lock report', 'open report.csv', 'connect db://main', 'query SELECT name FROM users', 'write Ada', 'write Grace', 'disconnect db://main', 'close report.csv', 'unlock report']);
```

## runtime: exportReport releases resources when the query fails

```js
const log = [];
await assert.rejects(exportReport(log, 'DROP TABLE users'), 'Invalid query');
assert.deepEqual(log.slice(-3), ['disconnect db://main', 'close report.csv', 'unlock report']);
```

## pattern: Uses using and await using

```regex
\busing\s+\w+\s*=[\s\S]*\bawait\s+using\s+\w+\s*=
```

## forbid: Does not dispose by hand

```regex
async function exportReport[\s\S]*\[\s*Symbol\.(dispose|asyncDispose)\s*\]\s*\(\s*\)
```
