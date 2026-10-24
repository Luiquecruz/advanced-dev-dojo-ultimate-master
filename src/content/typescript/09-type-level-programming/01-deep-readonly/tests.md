## type: DeepReadonly reaches nested objects

```ts
type State = { user: { profile: { name: string; age: number } }; count: number };
type _ = Expect<Equal<DeepReadonly<State>, {
  readonly user: { readonly profile: { readonly name: string; readonly age: number } };
  readonly count: number;
}>>;
```

## type: DeepReadonly turns arrays and tuples into readonly ones

```ts
type Data = { tags: string[]; matrix: number[][]; pair: [string, { id: number }] };
type _ = Expect<Equal<DeepReadonly<Data>, {
  readonly tags: readonly string[];
  readonly matrix: readonly (readonly number[])[];
  readonly pair: readonly [string, { readonly id: number }];
}>>;
```

## type: DeepReadonly keeps functions and primitives

```ts
type Handlers = { onSave: (id: number) => void; nested: { format(value: string): string } };
type _ = [
  Expect<Equal<DeepReadonly<Handlers>, {
    readonly onSave: (id: number) => void;
    readonly nested: { readonly format: (value: string) => string };
  }>>,
  Expect<Equal<DeepReadonly<string>, string>>,
  Expect<Equal<DeepReadonly<null>, null>>,
];
```

## type: DeepPartial makes nested plain objects optional

```ts
type Settings = {
  theme: { colors: { primary: string; accent: string }; dark: boolean };
  plugins: string[];
  onChange: (key: string) => void;
};
type _ = Expect<Equal<DeepPartial<Settings>, {
  theme?: { colors?: { primary?: string; accent?: string }; dark?: boolean };
  plugins?: string[];
  onChange?: (key: string) => void;
}>>;
const patch: DeepPartial<Settings> = { theme: { colors: { accent: 'red' } } };
```

## type: deepFreeze returns a deeply readonly value

```ts
const frozen = deepFreeze({ server: { port: 80 }, tags: ['a'] });
// @ts-expect-error
frozen.server.port = 81;
// @ts-expect-error
frozen.tags.push('b');
const port: number = frozen.server.port;
```

## runtime: deepFreeze freezes every level and returns the same object

```js
const config = { server: { port: 80, hosts: ['a', { name: 'b' }] }, flag: true };
const result = deepFreeze(config);
assert.equal(result, config);
assert.ok(Object.isFrozen(config));
assert.ok(Object.isFrozen(config.server));
assert.ok(Object.isFrozen(config.server.hosts));
assert.ok(Object.isFrozen(config.server.hosts[1]));
assert.equal(deepFreeze(42), 42);
```

## forbid: Does not use any or the built-in helpers

```regex
\bany\b|\b(Readonly|Partial)\s*<
```
