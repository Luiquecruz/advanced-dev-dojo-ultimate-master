## type: longest returns the caller's type

```ts
const numbers = longest([1, 2], [3]);
type _ = Expect<Equal<typeof numbers, number[]>>;
// @ts-expect-error numbers have no length
longest(10, 20);
```

## type: byPriority preserves the element type

```ts
const tasks = [{ title: 'Ship', priority: 2 }, { title: 'Plan', priority: 5 }] as const;
const sorted = byPriority(tasks);
const title: 'Ship' | 'Plan' = sorted[0].title;
// @ts-expect-error priority is required
byPriority([{ title: 'No priority' }]);
```

## type: totalBy types the selector parameter

```ts
const total = totalBy([{ price: 10 }], (item) => item.price);
type _ = Expect<Equal<typeof total, number>>;
// @ts-expect-error cost does not exist on the items
totalBy([{ price: 10 }], (item) => item.cost);
```

## runtime: longest picks the longer value and prefers a on ties

```js
assert.deepEqual(longest([1, 2], [3]), [1, 2]);
assert.equal(longest('ab', 'xyz'), 'xyz');
assert.equal(longest('ab', 'cd'), 'ab');
```

## runtime: byPriority sorts a copy, highest first

```js
const tasks = [{ title: 'a', priority: 1 }, { title: 'b', priority: 3 }, { title: 'c', priority: 2 }];
assert.deepEqual(byPriority(tasks).map((task) => task.title), ['b', 'c', 'a']);
assert.deepEqual(tasks.map((task) => task.title), ['a', 'b', 'c']);
```

## runtime: totalBy sums the selected values

```js
assert.equal(totalBy([{ price: 10 }, { price: 15 }], (item) => item.price), 25);
assert.equal(totalBy([], () => 1), 0);
```
