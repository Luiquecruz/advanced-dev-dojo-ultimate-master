`Pick` and `Omit` build a new object type from a **subset of the keys** of another one. They keep derived
types in sync with the source model: rename a field in `User` and every derived type follows.

```ts
interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

type UserPreview = Pick<User, 'id' | 'name'>;
// { id: number; name: string }

type PublicUser = Omit<User, 'passwordHash'>;
// { id: number; name: string; email: string; createdAt: Date }

type NewUser = Omit<User, 'id' | 'createdAt'>;
// what a "create user" form sends; the server generates the rest
```

Rule of thumb: **`Pick` when you need a few fields, `Omit` when you need all but a few.**

## How they are defined

```ts
type Pick<T, K extends keyof T> = { [P in K]: T[P] };
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
```

Notice the difference in constraints:

- `Pick` requires `K extends keyof T`, so a typo is an error: `Pick<User, 'nmae'>` fails.
- `Omit` only requires `K extends keyof any` (`string | number | symbol`). **A typo is silently accepted**:
  `Omit<User, 'passwordHsh'>` compiles and omits nothing.

Some teams define a strict variant for that reason:

```ts
type StrictOmit<T, K extends keyof T> = Omit<T, K>;
```

## Types are not runtime filters

`Omit` describes a shape; it does not remove anything from a value. Because of structural typing, a full
`User` **is assignable** to `PublicUser`, password included:

```ts
function toPublic(user: User): PublicUser {
  return user;   // compiles, and leaks passwordHash in the JSON response!
}
```

To actually drop the field, build a new object, for example with rest destructuring:

```ts
function toPublic(user: User): PublicUser {
  const { passwordHash, ...rest } = user;
  return rest;
}
```

## Pitfall: `Omit` on unions is not distributive

```ts
type Shape =
  | { kind: 'circle'; radius: number; id: string }
  | { kind: 'square'; size: number; id: string };

type WithoutId = Omit<Shape, 'id'>;
// { kind: 'circle' | 'square' }  ← radius and size are gone!
```

`keyof Shape` only contains the keys common to every member, so `Omit` collapses the union. When you need to
omit from each member separately, use a distributive helper (explained with conditional types later):

```ts
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
```

## Pick and Omit vs `extends`

You can also go the other way: declare the small type and extend it (`interface User extends UserPreview`).
Prefer that when the small type is a meaningful concept on its own; use `Pick`/`Omit` when it is a
view derived from a main model, such as DTOs, form values and API responses.
