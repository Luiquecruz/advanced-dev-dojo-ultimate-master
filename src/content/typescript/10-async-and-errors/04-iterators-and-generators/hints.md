`range` is a classic `for` loop with `yield value` in its body. Because the body only runs on `next()`, an infinite `end` is harmless.
---
In `chunk`, keep a `current` array. Push each item, and when it reaches `size`, `yield` it and start a new array. After the loop, yield what is left only if it is not empty.
---
For `Playlist`, add `implements Iterable<string>` and a generator method `*[Symbol.iterator]()` that runs `yield* this.#songs`. Each `for...of` calls the method again, producing a fresh generator.
