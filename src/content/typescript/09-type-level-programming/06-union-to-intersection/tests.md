## type: UnionToIntersection turns object unions into intersections

```ts
type _ = [
  Expect<Equal<UnionToIntersection<{ a: string } | { b: number }>, { a: string } & { b: number }>>,
  Expect<Equal<UnionToIntersection<{ id: 1 }>, { id: 1 }>>,
];
```

## type: Incompatible members collapse to never

```ts
type _ = [
  Expect<Equal<UnionToIntersection<'a' | 'b'>, never>>,
  Expect<Equal<UnionToIntersection<boolean>, never>>,
];
```

## type: A union of functions becomes an overloaded function

```ts
type Format = UnionToIntersection<((value: string) => string) | ((value: number) => boolean)>;
function useFormat(format: Format) {
  const text: string = format('a');
  const flag: boolean = format(1);
  // @ts-expect-error
  format(true);
}
```

## type: MergeAll flattens a tuple of objects

```ts
type _ = [
  Expect<Equal<MergeAll<[{ a: 1 }, { b: 2 }, { c: 3 }]>, { a: 1; b: 2; c: 3 }>>,
  Expect<Equal<MergeAll<[{ id: number }]>, { id: number }>>,
];
```

## type: mergeAll infers a flat result

```ts
const merged = mergeAll({ name: 'app' }, { port: 3000 }, { debug: true });
type _ = Expect<Equal<typeof merged, { readonly name: 'app'; readonly port: 3000; readonly debug: true }>>;
```

## runtime: mergeAll copies every object into a new one

```js
const first = { name: 'app' };
const merged = mergeAll(first, { port: 3000 }, { debug: true });
assert.deepEqual(merged, { name: 'app', port: 3000, debug: true });
assert.notEqual(merged, first);
assert.deepEqual(first, { name: 'app' });
```
