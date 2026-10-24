## Functions as values

A **higher-order function** takes a function as an argument, returns a function, or both. JavaScript is full of them: `map`, `filter`, `setTimeout`, event listeners, middleware. Typing them is about describing the **shape of the function** that flows in or out.

## Typing callbacks

Describe a callback with a function type expression, ideally named with a type alias:

```ts
type Predicate = (value: number, index: number) => boolean;

function countWhere(values: readonly number[], predicate: Predicate): number {
  let count = 0;
  values.forEach((value, index) => {
    if (predicate(value, index)) count++;
  });
  return count;
}

countWhere([5, 20, 50], (value) => value > 10);          // 2, ignores index
countWhere([5, 20, 50], (_, index) => index % 2 === 0);  // 2
```

Callers may pass a callback with **fewer** parameters than the type declares. That is why every callback of `map` can ignore the index and array arguments.

### Pitfall: optional callback parameters

It is tempting to write `(value?: number, index?: number) => boolean` "because the caller might not use them". That is backwards: the `?` tells callback **authors** that the value may be missing, so every callback now has to handle `undefined`:

```ts
type BadPredicate = (value?: number) => boolean;
const isLarge: BadPredicate = (value) => value > 10; // Error: 'value' is possibly 'undefined'
```

Rule from the handbook: **never use optional parameters in callback types** unless you really call the callback without them.

### `void` callbacks

A callback typed `() => void` may return anything; the result is ignored. Use `void` (not `undefined`) for callbacks whose return value you do not use.

## Returning functions (closures)

A function can build and return another function that remembers variables from its scope:

```ts
type Transform = (value: number) => number;

function multiplyBy(factor: number): Transform {
  return (value) => value * factor;   // value contextually typed by Transform
}

const double = multiplyBy(2);
double(21); // 42
```

Annotating the return type with a named alias makes the factory readable and gives the inner arrow function its parameter types for free.

## Composition

Small functions combine into pipelines. A rest parameter of function type accepts any number of steps:

```ts
function pipe(...steps: Transform[]): Transform {
  return (value) => steps.reduce((current, step) => step(current), value);
}

const process = pipe(multiplyBy(2), (value) => value + 1);
process(5); // 11
```

The order matters: `pipe` applies steps from left to right. (The mathematical `compose` goes right to left.)

## Legacy: callback-style async

Before promises, Node.js APIs used **error-first callbacks**:

```ts
type NodeCallback<T> = (error: Error | null, result?: T) => void;
readFile('a.txt', (error, data) => { /* ... */ });
```

Nested callbacks led to "callback hell". Promises and `async`/`await` replaced this style, but you still meet it in older libraries and in `util.promisify`.

## Generics preview

`countWhere` above only works for numbers. Built-in higher-order functions such as `Array.prototype.map<U>(callback: (value: T, ...) => U): U[]` use **generics** to work with any type while still linking the input and output types. The generics module builds on everything shown here.
