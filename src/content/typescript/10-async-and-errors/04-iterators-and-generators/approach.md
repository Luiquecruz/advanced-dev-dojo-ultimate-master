1. Implement `range` with `for (let value = start; value < end; value += step) yield value;`.
2. Implement `chunk` with `for...of` over `items`, a buffer array and `yield` whenever the buffer is full.
3. Yield the leftover buffer after the loop when it has at least one item.
4. Add `implements Iterable<string>` to `Playlist`.
5. Add `*[Symbol.iterator]()` returning `Generator<string, void, undefined>` and delegate to the private array with `yield*`.
