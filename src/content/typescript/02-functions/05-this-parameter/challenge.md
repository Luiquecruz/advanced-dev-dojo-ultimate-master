Make the counter API safe against lost `this`.

1. Give the standalone `increment` function a `this: Counter` parameter. It adds `step` to `count` and returns the new `count`.
2. Declare the same `this: Counter` parameter on the `increment` method in the `Counter` interface, so calling a detached `counter.increment` is a type error.
3. `createCounter(step: number): Counter` is provided and reuses `increment` as the method.
4. Implement `bindIncrement(counter: Counter): () => number`. It returns a function that can be called on its own and still increments that counter.

```ts
const counter = createCounter(2);
counter.increment();                 // 2
const next = bindIncrement(counter);
next();                              // 4
const detached = counter.increment;
detached();                          // type error
```
