## type: Simplify flattens intersections

```ts
type _ = [
  Expect<Equal<Simplify<{ a: 1 } & { b: 2 }>, { a: 1; b: 2 }>>,
  Expect<Equal<Simplify<{ id: number } & Record<'name', string>>, { id: number; name: string }>>,
];
```

## type: option accumulates keys and get returns a flat object

```ts
const config = createChainable()
  .option('name', 'app')
  .option('port', 3000)
  .option('features', { darkMode: true })
  .get();
type _ = Expect<Equal<typeof config, { name: string; port: number; features: { darkMode: boolean } }>>;
```

## type: An empty chain returns an empty object

```ts
const empty = createChainable().get();
type _ = Expect<Equal<typeof empty, {}>>;
```

## type: option rejects a key that was already set

```ts
const builder = createChainable().option('name', 'app');
// @ts-expect-error
builder.option('name', 'other');
builder.option('version', 2);
```

## type: Chainable works as a standalone type

```ts
function inspect(chain: Chainable<{ debug: boolean }>) {
  const result = chain.option('level', 'info' as 'info' | 'warn').get();
  type _ = Expect<Equal<typeof result, { debug: boolean; level: 'info' | 'warn' }>>;
  // @ts-expect-error
  chain.option('debug', false);
}
```

## runtime: createChainable collects every option without mutating previous steps

```js
const base = createChainable().option('name', 'app');
const withPort = base.option('port', 3000);
assert.deepEqual(withPort.get(), { name: 'app', port: 3000 });
assert.deepEqual(base.get(), { name: 'app' });
assert.deepEqual(createChainable().get(), {});
```
