## Cleanup is easy to forget

Files, locks, database connections, timers and subscriptions must be released when you are done. The classic tool is `try`/`finally`, which gets noisy fast and is easy to get wrong when several resources are involved:

```ts
const lock = acquireLock('report');
try {
  const file = openFile('report.csv');
  try {
    file.write('...');
  } finally {
    file.close();
  }
} finally {
  lock.release();
}
```

## using declarations

The **Explicit Resource Management** proposal (TypeScript 5.2+, now shipping in Chromium, Firefox and Node 24) adds `using`. A `using` variable is disposed automatically when its block exits, whether normally, through `return`, or because of an exception:

```ts
{
  using lock = acquireLock('report');
  using file = openFile('report.csv');
  file.write('...');
} // file disposed first, then lock
```

Resources are disposed in **reverse order** of declaration (last in, first out), just like nested `finally` blocks.

## The Disposable contracts

A value works with `using` when it implements `Disposable`, an object with a method keyed by the well-known symbol `Symbol.dispose`:

```ts
interface Disposable {
  [Symbol.dispose](): void;
}

function acquireLock(name: string): Disposable {
  console.log(`lock ${name}`);
  return {
    [Symbol.dispose]() {
      console.log(`unlock ${name}`);
    },
  };
}
```

For asynchronous cleanup (closing a socket, flushing a buffer) implement `AsyncDisposable` with `[Symbol.asyncDispose](): PromiseLike<void>` and declare the variable with **`await using`** inside an async function:

```ts
async function sync() {
  await using connection = await connect('db://main');
  await connection.query('SELECT 1');
} // awaits connection[Symbol.asyncDispose]() here
```

`await using` also accepts plain `Disposable` values. `null` and `undefined` are allowed and simply skipped, which makes optional resources easy.

Classes can implement the interfaces directly:

```ts
class TempDirectory implements Disposable {
  constructor(readonly path: string) {}

  [Symbol.dispose]() {
    removeDirectory(this.path);
  }
}
```

## Errors during disposal

If the block throws **and** a disposer throws too, neither error is lost: the runtime throws a `SuppressedError` whose `error` property is the disposal error and whose `suppressed` property is the original one.

## DisposableStack

When the number of resources is dynamic, or you need to adopt a value that is not disposable, use `DisposableStack` (and `AsyncDisposableStack`):

```ts
using stack = new DisposableStack();
const handles = paths.map((path) => stack.use(openFile(path)));
stack.defer(() => console.log('all files closed'));
const timer = stack.adopt(setInterval(poll, 1000), clearInterval);
```

`stack.move()` transfers ownership to a new stack, handy for constructors that acquire several resources and must clean up if a later step fails.

## Compiling and runtime support

- Types live in `lib.esnext.disposable` (included by `"lib": ["esnext"]`).
- When `target` is below `esnext`, TypeScript downlevels `using` into helper calls, but the runtime still needs `Symbol.dispose`, `Symbol.asyncDispose` and, for stacks, `DisposableStack`. Older runtimes need a polyfill such as `core-js`.
- Iterators created by generators are disposable too: `using it = numbers()` calls `it.return()` at the end of the block.

## Legacy vs modern

| Before | Now |
| --- | --- |
| nested `try`/`finally` | `using` / `await using` |
| ad-hoc `close()`, `release()`, `unsubscribe()` | standard `[Symbol.dispose]()` |
| cleanup lists in arrays | `DisposableStack` |

## Pitfalls

- `using` needs a block scope. It cannot be used at the top level of a script that is not a module, nor with `var`.
- `using x = value` captures the value at declaration time. Reassigning is not allowed (`using` bindings are constant).
- Returning a resource from a function that declared it with `using` returns an already disposed object. Declare it with `const` there and let the caller own it.
