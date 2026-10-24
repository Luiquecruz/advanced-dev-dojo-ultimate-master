The `this` parameter is written first and erased at runtime: `function increment(this: Counter): number`. Use the same form in the interface: `increment(this: Counter): number;`.
---
Inside `increment`, update `this.count` with `this.step` and return `this.count`.
---
`counter.increment` alone forgets its receiver. Return `counter.increment.bind(counter)` or `() => counter.increment()`.
