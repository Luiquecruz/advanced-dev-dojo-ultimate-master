## type: build() compiles only after url and method

```ts
request().url('/users').method('GET').build();
request().method('DELETE').url('/users/1').build();
// @ts-expect-error
request().url('/users').build();
// @ts-expect-error
request().method('GET').build();
// @ts-expect-error
request().build();
```

## type: body() is accepted only after method('POST') or method('PUT')

```ts
request().url('/users').method('POST').body('{}').build();
request().method('PUT').body('{}').url('/users/1').build();
// @ts-expect-error
request().url('/users').method('GET').body('{}');
// @ts-expect-error
request().url('/users').body('{}');
```

## type: build() returns HttpRequest and steps keep their state

```ts
const ready = request().url('/a').method('POST');
const built = ready.header('Accept', 'application/json').timeout(100).build();
type _ = Expect<Equal<typeof built, HttpRequest>>;
type _2 = Expect<Equal<typeof ready, RequestBuilder<'url' | 'method', 'POST'>>>;
```

## runtime: build() fills defaults and keeps every header

```js
const built = request().url('/users').method('GET').header('Accept', 'application/json').header('X-Trace', '1').build();
assert.deepEqual(built, { url: '/users', method: 'GET', headers: { Accept: 'application/json', 'X-Trace': '1' }, timeoutMs: 5000 });
const posted = request().url('/users').method('POST').body('{"name":"Ada"}').timeout(800).build();
assert.deepEqual(posted, { url: '/users', method: 'POST', headers: {}, body: '{"name":"Ada"}', timeoutMs: 800 });
assert.equal('body' in built, false);
```

## runtime: every step returns a new builder, so a shared base is never changed

```js
const base = request().url('/items').header('Accept', 'application/json');
const list = base.method('GET').build();
const create = base.method('POST').header('Content-Type', 'application/json').body('{}').build();
assert.deepEqual(list.headers, { Accept: 'application/json' });
assert.deepEqual(create.headers, { Accept: 'application/json', 'Content-Type': 'application/json' });
assert.equal(list.method, 'GET');
assert.notEqual(base.method('GET'), base.method('GET'));
```

## forbid: does not use any or type assertions to silence the checks

```regex
\bany\b|\bas\s+(unknown|never)\b
```
