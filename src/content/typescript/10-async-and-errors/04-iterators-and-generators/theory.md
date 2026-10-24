## The iteration protocols

`for...of`, spread (`[...x]`), destructuring, `Array.from` and `new Map(entries)` all consume **iterables**. Two small interfaces define the contract:

```ts
interface Iterator<T, TReturn = any, TNext = any> {
  next(...[value]: [] | [TNext]): IteratorResult<T, TReturn>;
}

interface Iterable<T> {
  [Symbol.iterator](): Iterator<T>;
}
```

`IteratorResult<T, TReturn>` is a discriminated union: `{ done: false; value: T }` while values flow, then `{ done: true; value: TReturn }` once finished. Arrays, strings, `Map`, `Set` and `arguments` are built-in iterables.

Writing an iterator by hand is verbose:

```ts
const countdown: Iterable<number> = {
  [Symbol.iterator]() {
    let current = 3;
    return {
      next: () => (current > 0 ? { done: false, value: current-- } : { done: true, value: undefined }),
    };
  },
};

[...countdown]; // [3, 2, 1]
```

## Generators write iterators for you

A `function*` returns a **generator object**: an iterator that is also iterable. Each `yield` hands out one value and **pauses** the function until the consumer asks for the next one.

```ts
function* countdown(from: number): Generator<number, void, undefined> {
  for (let current = from; current > 0; current--) {
    yield current;
  }
}

for (const n of countdown(3)) console.log(n); // 3, 2, 1
```

The three type parameters are `Generator<T, TReturn, TNext>`:

| Parameter | Meaning |
| --- | --- |
| `T` | type of each yielded value |
| `TReturn` | type of the `return` value (`void` when there is none) |
| `TNext` | type accepted by `next(value)`, i.e. what `yield` evaluates to inside |

Generators are **lazy**: nothing runs until someone calls `next()`. That makes infinite sequences safe as long as the consumer stops:

```ts
function* naturals(): Generator<number, never, undefined> {
  let n = 0;
  while (true) yield n++;
}
```

`yield* other` delegates to another iterable, which is handy for trees:

```ts
function* walk(node: TreeNode): Generator<TreeNode> {
  yield node;
  for (const child of node.children) yield* walk(child);
}
```

## Making a class iterable

Implement `[Symbol.iterator]` as a generator method. Every `for...of` calls it again, so the object can be iterated many times:

```ts
class Team implements Iterable<string> {
  #members: string[] = [];

  *[Symbol.iterator](): Generator<string, void, undefined> {
    yield* this.#members;
  }
}
```

## Iterator helpers (ES2025)

Built-in iterators, including generators, now share `Iterator.prototype` methods: `map`, `filter`, `take`, `drop`, `flatMap`, `reduce`, `toArray`, `some`, `every`, `find` and `forEach`. They are lazy, unlike their array cousins:

```ts
naturals().filter((n) => n % 2 === 0).map((n) => n * n).take(3).toArray(); // [0, 4, 16]
```

`Iterator.from(iterable)` wraps any iterable so it gets the helpers too. TypeScript models these with `IteratorObject<T, TReturn, TNext>`, the base interface of `Generator`, `ArrayIterator`, `MapIterator` and friends.

## Legacy vs modern

- Compiling `for...of` over iterables to ES5 needed `--downlevelIteration`. TypeScript 6.0 deprecates both `target: es5` and that flag; TypeScript 7 removes them.
- Since TypeScript 5.6, `strictBuiltinIteratorReturn` (part of `strict`) types the `TReturn` of built-in iterators as `undefined` instead of `any`, so `map.keys().next().value` is correctly `K | undefined`.

## Pitfalls

- A generator object can be consumed **once**. Spreading it twice gives an empty array the second time. Return a fresh generator, or implement `Iterable`, when callers need to iterate again.
- Spreading an infinite generator hangs the program. Use `take()` or a `break`.
- Code before the first `yield` does not run when the generator is created, only on the first `next()`.
