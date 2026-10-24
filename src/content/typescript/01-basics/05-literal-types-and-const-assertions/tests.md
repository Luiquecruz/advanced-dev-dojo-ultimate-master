## type: HttpMethod is the union of the four methods

```ts
type _ = Expect<Equal<HttpMethod, 'GET' | 'POST' | 'PUT' | 'DELETE'>>;
```

## type: HTTP_METHODS is a readonly tuple

```ts
type _ = Expect<Equal<typeof HTTP_METHODS, readonly ['GET', 'POST', 'PUT', 'DELETE']>>;
// @ts-expect-error
HTTP_METHODS.push('PATCH');
```

## type: defaultRequest.method keeps the literal "GET"

```ts
type _ = Expect<Equal<(typeof defaultRequest)['method'], 'GET'>>;
describeRequest(defaultRequest);
```

## type: describeRequest rejects unknown methods

```ts
// @ts-expect-error
describeRequest({ url: '/', method: 'PATCH' });
```

## runtime: describeRequest formats method and url

```js
assert.equal(describeRequest(defaultRequest), 'GET /api/users'); assert.equal(describeRequest({ url: '/api/todos', method: 'POST' }), 'POST /api/todos');
```
