## type: Generators and the playlist have iterable types

```ts
type _ = [
  Expect<Equal<ReturnType<typeof range>, Generator<number, void, undefined>>>,
  Expect<Equal<ReturnType<typeof chunk<string>>, Generator<string[], void, undefined>>>,
];
const songs: Iterable<string> = new Playlist();
for (const song of new Playlist()) {
  expectType<string>(song);
}
```

## runtime: range yields values below end with an optional step

```js
assert.deepEqual([...range(0, 5)], [0, 1, 2, 3, 4]);
assert.deepEqual([...range(0, 10, 3)], [0, 3, 6, 9]);
assert.deepEqual([...range(5, 5)], []);
```

## runtime: range is lazy and handles infinite ends

```js
const numbers = range(10, Infinity, 5);
assert.equal(numbers.next().value, 10);
assert.equal(numbers.next().value, 15);
assert.equal(numbers.next().value, 20);
```

## runtime: chunk groups any iterable and keeps the remainder

```js
assert.deepEqual([...chunk('abcde', 2)], [['a', 'b'], ['c', 'd'], ['e']]);
assert.deepEqual([...chunk(new Set([1, 2, 3]), 3)], [[1, 2, 3]]);
assert.deepEqual([...chunk([], 2)], []);
const firstChunk = chunk(range(0, Infinity), 3).next().value;
assert.deepEqual(firstChunk, [0, 1, 2]);
```

## runtime: Playlist can be iterated more than once

```js
const playlist = new Playlist().add('Intro').add('Main theme').add('Outro');
assert.deepEqual([...playlist], ['Intro', 'Main theme', 'Outro']);
assert.deepEqual(Array.from(playlist), ['Intro', 'Main theme', 'Outro']);
```
