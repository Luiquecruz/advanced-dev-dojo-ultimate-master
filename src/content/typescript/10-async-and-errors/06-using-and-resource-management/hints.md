Start with the types: `interface FileHandle extends Disposable` makes the compiler point at the missing `[Symbol.dispose]` method in `openFile`.
---
Inside `exportReport`, replace `const` with `using` for the lock and the file, and with `await using` for the connection. Then delete the manual dispose calls.
---
Declaration order decides disposal order: the connection is declared last, so it is disconnected first, then the file is closed, then the lock is released, even when `query` throws.
