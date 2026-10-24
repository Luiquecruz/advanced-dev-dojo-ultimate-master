Many APIs address nested data with **dot paths**: `get(user, 'address.city')` in lodash,
`register('profile.email')` in react-hook-form, `t('errors.network.timeout')` in i18n libraries, or
`orderBy('customer.name')` in query builders. With plain `string` parameters, a typo is a runtime bug.
With path types, the compiler lists every valid path and knows the type at each one.

## Step 1: one level of keys

The paths of a flat object are just its string keys:

```ts
type Keys<T> = keyof T & string;
```

`& string` drops `number` and `symbol` keys, which cannot appear in a template literal.

## Step 2: recursion with a mapped type

To go deeper, map every key to "this key, plus this key followed by the paths of its value", then read
the union of all values with `[keyof T & string]`:

```ts
type PathsOf<T> = {
  [K in keyof T & string]: T[K] extends object ? K | `${K}.${PathsOf<T[K]>}` : K;
}[keyof T & string];

type User = { name: string; address: { city: string; geo: { lat: number } } };
type P = PathsOf<User>;
// 'name' | 'address' | 'address.city' | 'address.geo' | 'address.geo.lat'
```

The `{ ... }[keyof T]` trick (a mapped type immediately indexed by its own keys) is the standard way to
compute **one union** from per-key results.

## Step 3: decide what is a leaf

Arrays, functions and class instances such as `Date` are objects too. Without extra branches,
`PathsOf<{ tags: string[] }>` would produce `'tags.length'`, `'tags.push'`, and so on. Decide which types
are leaves and check them **before** the `object` branch:

```ts
type IsLeaf<V> = V extends readonly unknown[] | ((...args: never[]) => unknown) | Date ? true : false;
```

Real libraries go further and support numeric segments for arrays (`'items.0.price'`) using
`${number}`, at the cost of more complex types.

## Step 4: reading the type at a path

`Get` walks the path one segment at a time with template literal inference:

```ts
type ValueAt<T, P extends string> =
  P extends `${infer Head}.${infer Rest}`
    ? Head extends keyof T ? ValueAt<T[Head], Rest> : never
    : P extends keyof T ? T[P] : never;

type City = ValueAt<User, 'address.city'>; // string
type Bad  = ValueAt<User, 'address.zip'>;  // never
```

## Step 5: a typed runtime function

Constraining the path parameter with the union of valid paths gives autocomplete and errors at call sites:

```ts
declare function get<T, P extends PathsOf<T>>(source: T, path: P): ValueAt<T, P>;

get(user, 'address.geo.lat'); // number
get(user, 'address.zip');     // error: not assignable to the union of paths
```

## Pitfalls

- **Optional properties**: `T[K]` of an optional object property is `X | undefined`, which is not assignable
  to `object`. Wrap with `NonNullable<T[K]>` before recursing if optional branches should be traversed.
- **Index signatures** (`Record<string, X>`) produce paths with `${string}` holes, which accept anything.
- **Performance**: the number of paths grows with every level. Deep or recursive types (a `Node` that
  contains `Node`) need a depth limit, usually implemented with a tuple counter.
