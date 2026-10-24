## `this` depends on the call site

In JavaScript, `this` inside a regular function is decided by **how** the function is called, not where it is written:

```ts
const counter = {
  count: 0,
  increment() {
    this.count++;
  },
};

counter.increment();                 // this === counter
const detached = counter.increment;
detached();                          // this === undefined in strict mode: TypeError
setTimeout(counter.increment, 100);  // same problem
```

Losing `this` when a method is passed around as a callback is one of the most common JavaScript bugs.

## The `this` parameter

TypeScript lets you declare the expected type of `this` as a fake **first parameter** named `this`. It is erased from the JavaScript output and does not count as an argument:

```ts
interface Counter {
  count: number;
  step: number;
}

function increment(this: Counter): number {
  this.count += this.step;   // this is typed
  return this.count;
}

const counter = { count: 0, step: 2, increment };
counter.increment();   // ok: called as a method of a Counter

increment();
// Error: The 'this' context of type 'void' is not assignable to method's 'this' of type 'Counter'.
```

The compiler now checks every call site. A `this` parameter in an interface method works the same way and protects consumers from detaching the method:

```ts
interface Counter {
  increment(this: Counter): number;
}
const run = counter.increment;
run(); // Error
```

With `noImplicitThis` (part of `strict`), using `this` in a standalone function without a `this` parameter is an error, because its type would be `any`.

## Fixing detached methods

| Technique | Example |
| --- | --- |
| `bind` | `const run = counter.increment.bind(counter)` |
| Wrapping arrow | `const run = () => counter.increment()` |
| Arrow function property | `increment = () => { this.count++ }` (classes) |

TypeScript types `bind` precisely (`strictBindCallApply`). The result of `fn.bind(obj)` is checked against `fn`'s `this` parameter and its type drops the `this` parameter:

```ts
const run = increment.bind(counter);   // () => number
increment.bind({ count: 0 });          // Error: Property 'step' is missing
```

Arrow functions do not have their own `this`; they capture it from the surrounding scope. That is why they cannot declare a `this` parameter and why they are the modern fix for callbacks.

## `this: void`

A callback type can declare `this: void` to say "I will call you without a receiver". Passing a function that declares `this: Counter` is then rejected, which prevents the detached-method bug at the API boundary:

```ts
function onClick(handler: (this: void, event: string) => void) { /* ... */ }
```

## Utility types

- `ThisParameterType<typeof increment>` extracts the `this` type (`Counter`), or `unknown` when there is none.
- `OmitThisParameter<typeof increment>` removes it: `() => number`.

## Legacy

Before arrow functions, code saved the receiver manually (`var self = this;`) or bound every method in the constructor (`this.handleClick = this.handleClick.bind(this)`), a pattern still visible in older React class components.
