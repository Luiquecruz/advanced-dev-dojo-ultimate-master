`memoize` runs once per class. Create the `WeakMap` inside `memoize`, then return `function (this: This, arg: Arg): Return { ... }` that looks up (or creates) the instance's `Map`.
---
Call the original with `target.call(this, arg)` and store the result. Check `cache.has(arg)` before reading, because a cached result could legitimately be `undefined`.
---
For `bound`, inside `context.addInitializer(function () { ... })`, `this` is the new instance. `Object.defineProperty(this, context.name, { value: target.bind(this), writable: true, configurable: true })` shadows the prototype method.
---
For `clamp`, compute `Math.min(max, Math.max(min, value))` and return `{ init(value) { return limit(value); }, set(value) { target.set.call(this, limit(value)); } }`.
