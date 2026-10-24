## type: Signatures keep their promise types

```ts
type _ = [
  Expect<Equal<ReturnType<typeof withTimeout<string>>, Promise<string>>>,
  Expect<Equal<Awaited<ReturnType<typeof loadDashboard>>, Dashboard>>,
];
// @ts-expect-error
const wrong: Promise<number> = withTimeout(Promise.resolve('text'), 10);
```

## runtime: withTimeout resolves with the value when the promise is fast

```js
assert.equal(await withTimeout(delay(10).then(() => 'ok'), 200), 'ok');
```

## runtime: withTimeout rejects with "Timed out after <ms>ms" when the promise is slow

```js
await assert.rejects(withTimeout(delay(300), 20), 'Timed out after 20ms');
```

## runtime: withTimeout propagates the original rejection

```js
await assert.rejects(withTimeout(Promise.reject(new Error('boom')), 100), 'boom');
```

## runtime: loadDashboard requests user and orders in parallel

```js
const api = {
  getUser: (id) => delay(120).then(() => ({ id, name: 'Ada' })),
  getOrders: () => delay(120).then(() => [{ id: 1, total: 50 }, { id: 2, total: 25 }]),
};
const started = Date.now();
const dashboard = await loadDashboard(api, 1);
const elapsed = Date.now() - started;
assert.deepEqual(dashboard, { userName: 'Ada', orderCount: 2, revenue: 75 });
assert.ok(elapsed < 200, `Expected both requests to run in parallel, took ${elapsed}ms`);
```

## pattern: Uses Promise.all and Promise.race

```regex
Promise\.all\([\s\S]*Promise\.race\(|Promise\.race\([\s\S]*Promise\.all\(
```
