## type: Mutable removes readonly and keeps optional properties

```ts
type Settings = { readonly theme: string; readonly fontSize?: number };
type _ = [
  Expect<Equal<Mutable<Settings>, { theme: string; fontSize?: number }>>,
  Expect<Equal<Mutable<readonly string[]>, string[]>>,
];
const settings: Mutable<Settings> = { theme: 'dark' };
settings.theme = 'light';
```

## type: Concrete makes every property required

```ts
type Draft = { title?: string; tags?: string[]; readonly id: number };
type _ = Expect<Equal<Concrete<Draft>, { title: string; tags: string[]; readonly id: number }>>;
```

## type: Nullable adds null and keeps modifiers

```ts
type Profile = { readonly id: number; name: string; bio?: string };
type _ = Expect<Equal<Nullable<Profile>, { readonly id: number | null; name: string | null; bio?: string | null }>>;
const profile: Nullable<Profile> = { id: null, name: null };
// @ts-expect-error
profile.id = 2;
```

## type: FlagMap has exactly one boolean per key

```ts
type _ = [
  Expect<Equal<FlagMap<'darkMode' | 'beta'>, { darkMode: boolean; beta: boolean }>>,
  Expect<Equal<keyof FlagMap<'a' | 'b' | 'c'>, 'a' | 'b' | 'c'>>,
];
```

## type: createFlags infers the keys

```ts
const flags = createFlags(['darkMode', 'beta']);
type _ = Expect<Equal<typeof flags, FlagMap<'darkMode' | 'beta'>>>;
// @ts-expect-error
flags.unknownFlag;
```

## runtime: createFlags sets every key to false

```js
assert.deepEqual(createFlags(['darkMode', 'beta']), { darkMode: false, beta: false });
assert.deepEqual(createFlags([]), {});
```

## forbid: Does not use any or the built-in Required

```regex
\bany\b|\bRequired\s*<
```
