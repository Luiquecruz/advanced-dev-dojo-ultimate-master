1. Add `extends Disposable` to `FileHandle`.
2. Add `[Symbol.dispose]() { log.push(`close ${path}`); }` to the object returned by `openFile`.
3. In `exportReport`, declare `lock` and `file` with `using` and `connection` with `await using`, in that order.
4. Keep the query and the write loop, and return `rows.length`.
5. Remove the hand-written `[Symbol.asyncDispose]()` and `[Symbol.dispose]()` calls; the block exit now handles them.
