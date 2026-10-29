Predict what real Node prints. Each snippet below is the whole content of a CommonJS script run with `node snippet.cjs` (so the main script finishes before any queue drains). Write your answers as data in `main.ts`.

**1. `basics`**

```ts
console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve().then(() => console.log('C'));
process.nextTick(() => console.log('D'));
queueMicrotask(() => console.log('E'));
process.nextTick(() => console.log('F'));
console.log('G');
```

**2. `asyncAwait`**

```ts
async function run() {
  console.log('run start');
  await null;
  console.log('run end');
}
console.log('script start');
run();
Promise.resolve().then(() => console.log('then'));
console.log('script end');
```

**3. `nested`**

```ts
Promise.resolve().then(() => {
  console.log('promise 1');
  process.nextTick(() => console.log('tick from promise'));
});
Promise.resolve().then(() => console.log('promise 2'));
process.nextTick(() => {
  console.log('tick 1');
  Promise.resolve().then(() => console.log('promise from tick'));
});
```

**4. `ioCallback`** (`readFile` is the callback API of `node:fs`)

```ts
readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
  process.nextTick(() => console.log('tick'));
});
console.log('reading');
```

**5. `blocking`**

```ts
const start = Date.now();
setTimeout(() => console.log(Date.now() - start >= 100 ? 'timer late' : 'timer on time'), 10);
while (Date.now() - start < 100) {}
console.log('loop done');
```

Exports:

1. `predictions`: an object with the keys `basics`, `asyncAwait`, `nested`, `ioCallback` and `blocking`. Each value is the array of printed strings in the order Node prints them, for example `['A', ...]`. Every logged string appears exactly once.
2. `queueFor`: an object that maps each API to the queue that runs its callback. Keys: `'process.nextTick'`, `'Promise.then'`, `'queueMicrotask'`, `'setTimeout'`, `'setInterval'`, `'setImmediate'`, `'fs.readFile callback'`. Values: `'nextTick'`, `'microtask'`, `'timers'`, `'poll'` or `'check'`.

The tests tell you which snippet is wrong, not the right order: reason about the queues.
