## pattern: Uses const type parameters

```regex
<\s*const\s+T\b
```

## type: tuple keeps literal element types

```ts
const values = tuple(1, 'a', true);
type _ = Expect<Equal<typeof values, [1, 'a', true]>>;
```

## type: oneOf returns a precise type guard

```ts
const isRole = oneOf(['admin', 'editor']);
type _ = Expect<Equal<typeof isRole, (input: unknown) => input is 'admin' | 'editor'>>;
const input: unknown = 'admin';
if (isRole(input)) {
  const role: 'admin' | 'editor' = input;
}
```

## type: defineRoutes keeps readonly literal paths

```ts
const routes = defineRoutes({ home: '/', user: '/users/:id' });
type _ = Expect<Equal<typeof routes, { readonly home: '/'; readonly user: '/users/:id' }>>;
// @ts-expect-error route values must be strings
defineRoutes({ home: 1 });
```

## runtime: The helpers return their inputs and the guard checks membership

```js
assert.deepEqual(tuple(1, 'a', true), [1, 'a', true]);
const isRole = oneOf(['admin', 'editor']);
assert.equal(isRole('admin'), true);
assert.equal(isRole('viewer'), false);
assert.equal(isRole(42), false);
const routes = { home: '/' };
assert.equal(defineRoutes(routes), routes);
```

## forbid: Callers should not need as const

```regex
as\s+const
```
