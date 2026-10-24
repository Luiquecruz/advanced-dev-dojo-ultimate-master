## type: Paths lists every nested path

```ts
type User = { name: string; address: { city: string; geo: { lat: number; lng: number } } };
type _ = Expect<Equal<Paths<User>, 'name' | 'address' | 'address.city' | 'address.geo' | 'address.geo.lat' | 'address.geo.lng'>>;
```

## type: Paths treats arrays and functions as leaves

```ts
type Post = { tags: string[]; meta: { authors: { name: string }[]; format: (value: string) => string } };
type _ = Expect<Equal<Paths<Post>, 'tags' | 'meta' | 'meta.authors' | 'meta.format'>>;
```

## type: Get resolves the type at a path

```ts
type User = { name: string; address: { city: string; geo: { lat: number } }; tags: string[] };
type _ = [
  Expect<Equal<Get<User, 'name'>, string>>,
  Expect<Equal<Get<User, 'address'>, { city: string; geo: { lat: number } }>>,
  Expect<Equal<Get<User, 'address.geo.lat'>, number>>,
  Expect<Equal<Get<User, 'tags'>, string[]>>,
];
```

## type: Get returns never for missing paths

```ts
type User = { name: string; address: { city: string } };
type _ = [
  Expect<Equal<Get<User, 'address.zip'>, never>>,
  Expect<Equal<Get<User, 'age'>, never>>,
  Expect<Equal<Get<User, 'name.first'>, never>>,
];
```

## type: getByPath only accepts valid paths and returns precise types

```ts
const user = { name: 'Ada', address: { city: 'London', geo: { lat: 51.5 } }, tags: ['math'] };
const lat = getByPath(user, 'address.geo.lat');
const tags = getByPath(user, 'tags');
type _ = [
  Expect<Equal<typeof lat, number>>,
  Expect<Equal<typeof tags, string[]>>,
];
// @ts-expect-error
getByPath(user, 'address.zip');
// @ts-expect-error
getByPath(user, 'tags.length');
```

## runtime: getByPath reads nested values

```js
const user = { name: 'Ada', address: { city: 'London', geo: { lat: 51.5 } }, tags: ['math'] };
assert.equal(getByPath(user, 'name'), 'Ada');
assert.equal(getByPath(user, 'address.city'), 'London');
assert.equal(getByPath(user, 'address.geo.lat'), 51.5);
assert.deepEqual(getByPath(user, 'tags'), ['math']);
```

## forbid: Does not use any

```regex
\bany\b
```
