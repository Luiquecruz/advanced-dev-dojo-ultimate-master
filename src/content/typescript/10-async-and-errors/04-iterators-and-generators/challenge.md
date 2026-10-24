Build three lazy iteration helpers with generators.

1. `range(start: number, end: number, step = 1): Generator<number, void, undefined>` yields `start`, `start + step`, … while the value is **less than** `end`. It must be lazy, so `range(0, Infinity)` is safe to create and step through.
2. `chunk<T>(items: Iterable<T>, size: number): Generator<T[], void, undefined>` yields arrays of `size` items in order. The last chunk may be shorter, and no empty chunk is yielded. It must accept any iterable (arrays, strings, `Set`s, other generators) and pull items lazily.
3. `Playlist` implements `Iterable<string>`:
   - `add(song: string): this` appends a song and returns the playlist for chaining
   - iterating the playlist yields songs in insertion order, and it can be iterated **more than once**

```ts
[...range(0, 10, 3)];                    // [0, 3, 6, 9]
[...chunk('abcde', 2)];                  // [['a', 'b'], ['c', 'd'], ['e']]
[...new Playlist().add('Intro').add('Outro')]; // ['Intro', 'Outro']
```
