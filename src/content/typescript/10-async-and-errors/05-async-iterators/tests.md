## type: Helpers keep their element types

```ts
const numbers: FetchPage<number> = async () => ({ items: [1], nextCursor: null });
expectType<AsyncGenerator<number, void, undefined>>(paginate(numbers));
const labels = mapAsync(paginate(numbers), async (value) => `#${value}`);
type _ = [
  Expect<Equal<typeof labels, AsyncGenerator<string, void, undefined>>>,
  Expect<Equal<ReturnType<typeof take<string>>, Promise<string[]>>>,
];
```

## runtime: paginate yields every item across pages in order

```js
const pages = { start: { items: [1, 2], nextCursor: 'b' }, b: { items: [3, 4], nextCursor: 'c' }, c: { items: [5], nextCursor: null } };
const cursors = [];
const fetchPage = async (cursor) => { cursors.push(cursor); return pages[cursor ?? 'start']; };
const values = [];
for await (const value of paginate(fetchPage)) values.push(value);
assert.deepEqual(values, [1, 2, 3, 4, 5]);
assert.deepEqual(cursors, [null, 'b', 'c']);
```

## runtime: paginate only fetches pages the consumer needs

```js
const pages = { start: { items: ['a', 'b'], nextCursor: 'p2' }, p2: { items: ['c'], nextCursor: 'p3' }, p3: { items: ['d'], nextCursor: null } };
let requests = 0;
const fetchPage = async (cursor) => { requests++; return pages[cursor ?? 'start']; };
const firstTwo = [];
for await (const value of paginate(fetchPage)) {
  firstTwo.push(value);
  if (firstTwo.length === 2) break;
}
assert.deepEqual(firstTwo, ['a', 'b']);
assert.equal(requests, 1, `Expected 1 page request, got ${requests}`);
```

## runtime: take stops after count values

```js
let produced = 0;
async function* naturals() { while (true) { produced++; yield produced; } }
assert.deepEqual(await take(naturals(), 3), [1, 2, 3]);
assert.equal(produced, 3);
async function* short() { yield 'x'; }
assert.deepEqual(await take(short(), 5), ['x']);
```

## runtime: mapAsync awaits sync and async transforms

```js
async function* source() { yield 1; yield 2; yield 3; }
assert.deepEqual(await take(mapAsync(source(), async (n) => n * 10), 10), [10, 20, 30]);
assert.deepEqual(await take(mapAsync(source(), (n) => `#${n}`), 2), ['#1', '#2']);
```

## pattern: Uses for await

```regex
for\s+await\s*\(
```
