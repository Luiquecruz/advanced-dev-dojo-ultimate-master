Two type operators let you derive types from other types instead of repeating them.

## `keyof`: the union of property names

```ts
interface User {
  id: number;
  name: string;
  active: boolean;
}

type UserKey = keyof User; // "id" | "name" | "active"
```

With index signatures, `keyof` returns the index type. Note that a string index also allows numeric keys,
because JavaScript converts `obj[1]` to `obj["1"]`:

```ts
type Dictionary = { [key: string]: number };
type DictionaryKey = keyof Dictionary; // string | number
```

## Indexed access: `T[K]`

Square brackets on a **type** look up the type of a property:

```ts
type UserName = User['name'];              // string
type IdOrName = User['id' | 'name'];       // number | string
type AnyValue = User[keyof User];          // number | string | boolean

const roles = ['admin', 'editor', 'viewer'] as const;
type Role = (typeof roles)[number];        // "admin" | "editor" | "viewer"
```

`T[number]` reads the element type of an array or tuple. Combined with `typeof` and `as const`, it turns a
runtime list into a union type, so the list is the single source of truth.

## Combining them with generics

`K extends keyof T` constrains a key to the real property names of `T`, and `T[K]` gives the matching value
type. This is how you write a type-safe property getter:

```ts
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user: User = { id: 1, name: 'Ada', active: true };
getProperty(user, 'name');    // string
getProperty(user, 'active');  // boolean
getProperty(user, 'email');   // error: '"email"' is not assignable to parameter of type 'keyof User'
```

`K` is inferred as the **literal** key (`'name'`), so the return type is exact. If you typed the parameter
as `key: keyof T`, the result would be the union of every value type.

## Pitfall: `Object.keys` returns `string[]`

```ts
for (const key of Object.keys(user)) {
  user[key]; // error: string can't index User
}
```

This is deliberate. Because typing is structural, a value of type `User` may have **more** properties than
`User` declares, so promising `(keyof User)[]` would be a lie. Options: iterate a known list of keys,
use `Object.entries` and treat values as `unknown`, or cast when you control where the object came from
(`Object.keys(user) as (keyof User)[]`).

## Pitfall: `keyof` on unions

`keyof (A | B)` contains only the keys **common** to both members, since only those are safe to read on
every member. `keyof (A & B)` contains the keys of both.

## When to use what

- Use `keyof T` to accept "one of the property names".
- Use `T[K]` to describe "the value at that property".
- Use `(typeof list)[number]` to derive unions from constant arrays.
