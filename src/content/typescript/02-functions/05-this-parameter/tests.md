## type: increment declares this: Counter

```ts
type _ = Expect<Equal<ThisParameterType<typeof increment>, Counter>>;
```

## type: Calling a detached method is rejected

```ts
const counter = createCounter(1);
counter.increment();
const detached = counter.increment;
// @ts-expect-error
detached();
```

## runtime: increment adds the step on each call

```js
const counter = createCounter(2); assert.equal(counter.increment(), 2); assert.equal(counter.increment(), 4); assert.equal(counter.count, 4);
```

## runtime: bindIncrement keeps the counter attached

```js
const counter = createCounter(1); const next = bindIncrement(counter); assert.equal(next(), 1); assert.equal(next(), 2); assert.equal(counter.count, 2);
```

## type: bindIncrement returns a function without a this parameter

```ts
type _ = Expect<Equal<ReturnType<typeof bindIncrement>, () => number>>;
const next = bindIncrement(createCounter(1));
const value: number = next();
```
