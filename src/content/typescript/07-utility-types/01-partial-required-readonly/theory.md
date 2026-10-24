TypeScript ships **utility types**: generic types that transform other types. They let you derive variants
of a model instead of copying it by hand. The first three change property **modifiers**.

```ts
interface Profile {
  name: string;
  bio?: string;
  age: number;
}
```

## `Partial<T>`: every property optional

```ts
type ProfilePatch = Partial<Profile>;
// { name?: string; bio?: string; age?: number }

function updateProfile(profile: Profile, patch: Partial<Profile>): Profile {
  return { ...profile, ...patch };
}

updateProfile(ada, { age: 37 });   // only the fields that change
```

Typical uses: PATCH payloads, update functions, option objects merged with defaults.

## `Required<T>`: every property required

```ts
type CompleteProfile = Required<Profile>;
// { name: string; bio: string; age: number }
```

`Required` removes `?` **and** `undefined` that came from the optional marker. A classic use is the
"resolved options" type after defaults have been applied.

## `Readonly<T>`: every property readonly

```ts
const frozen: Readonly<Profile> = { name: 'Ada', age: 36 };
frozen.age = 37;  // error: Cannot assign to 'age' because it is a read-only property
```

`Object.freeze(value)` returns `Readonly<T>`, combining the compile-time and runtime guarantees. For arrays
use `readonly T[]` or `ReadonlyArray<T>`, which also removes mutating methods like `push`.

## How they are built

They are **mapped types** from `lib.es5.d.ts`, with modifiers added or removed:

```ts
type Partial<T> = { [P in keyof T]?: T[P] };
type Required<T> = { [P in keyof T]-?: T[P] };
type Readonly<T> = { readonly [P in keyof T]: T[P] };
```

You will write your own mapped types in the advanced module. For now, note that they combine:
`Readonly<Partial<Profile>>` is a read-only patch.

## Pitfalls

**They are shallow.** Only top-level properties change:

```ts
type Settings = { theme: { color: string } };
const settings: Readonly<Settings> = { theme: { color: 'red' } };
settings.theme.color = 'blue';   // allowed: the nested object is still mutable
```

A deep version needs a recursive type (see the type-level module) or `as const` on literals.

**Readonly is not immutability.** It is a compile-time check. Another reference typed without `readonly`
can still mutate the same object, and plain JavaScript ignores it.

**Spreading `undefined` overrides values.** Optional properties accept an explicit `undefined`, and the
spread operator copies it:

```ts
const defaults = { color: 'red', size: 12 };
const options: Partial<typeof defaults> = { size: undefined };
const merged = { ...defaults, ...options };   // size is undefined at runtime!
```

Use `??` per field (`size: options.size ?? defaults.size`), or enable `exactOptionalPropertyTypes`, which
forbids assigning `undefined` to optional properties unless the type says so explicitly.
