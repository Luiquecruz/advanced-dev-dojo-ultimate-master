## type: ApiResponse defaults to unknown data and ApiError errors

```ts
type _ = [
  Expect<Equal<ApiResponse, { ok: true; data: unknown } | { ok: false; error: ApiError }>>,
  Expect<Equal<ApiResponse<number>, { ok: true; data: number } | { ok: false; error: ApiError }>>,
  Expect<Equal<ApiResponse<number, string>, { ok: true; data: number } | { ok: false; error: string }>>,
];
```

## type: Paginated defaults the cursor to number

```ts
type _ = [
  Expect<Equal<Paginated<string>['next'], number | null>>,
  Expect<Equal<Paginated<string, string>['next'], string | null>>,
];
```

## type: failure defaults to never but follows the expected type

```ts
const plain = failure(500, 'Boom');
const typed: ApiResponse<number> = failure(404, 'Missing');
type _ = Expect<Equal<typeof plain, ApiResponse<never>>>;
```

## type: createCollection defaults to string[]

```ts
const empty = createCollection();
const numbers = createCollection(1, 2);
type _ = [Expect<Equal<typeof empty, string[]>>, Expect<Equal<typeof numbers, number[]>>];
```

## runtime: success and failure build responses

```js
assert.deepEqual(success(42), { ok: true, data: 42 });
assert.deepEqual(failure(404, 'Not found'), { ok: false, error: { code: 404, message: 'Not found' } });
const items = [1, 2];
const collection = createCollection(...items);
assert.deepEqual(collection, [1, 2]);
assert.notEqual(collection, items);
```
