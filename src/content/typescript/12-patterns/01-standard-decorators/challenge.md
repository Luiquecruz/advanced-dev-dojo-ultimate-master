`Thermostat` already uses three decorators, but they do nothing yet. Implement them with the **standard** decorator API.

1. `memoize`: a method decorator for single-argument methods. Return a replacement method that caches results **per instance** and **per argument**, calling the original only on a cache miss. Use a `WeakMap` keyed by `this` holding a `Map` from argument to result.
2. `bound`: a method decorator that uses `context.addInitializer` to define a bound copy of the method on each instance, so `const { describe } = thermostat; describe()` still works.
3. `clamp(min, max)`: a decorator factory for `accessor` fields. Return `init` and `set` hooks that keep the value between `min` and `max`.

```ts
const kitchen = new Thermostat('Kitchen');
kitchen.toFahrenheit(100);   // 212, computed
kitchen.toFahrenheit(100);   // 212, cached: computations stays 1
kitchen.target = 50;         // stored as 30
const { describe } = kitchen;
describe();                  // "Kitchen: 30°C"
```

Keep the decorator signatures: applying `@memoize` to a method with two parameters must remain a type error.
