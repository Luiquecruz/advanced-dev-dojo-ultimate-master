`Record<K, V>` describes an object whose keys are `K` and whose values are all `V`.

```ts
type Record<K extends keyof any, T> = { [P in K]: T };
```

It behaves very differently depending on what `K` is.

## Union keys: an exhaustive map

With a union of literal keys, `Record` requires **every** key:

```ts
type Status = 'todo' | 'in-progress' | 'done';

const STATUS_COLORS: Record<Status, string> = {
  todo: 'gray',
  'in-progress': 'blue',
  done: 'green',
};
```

Add `'archived'` to `Status` and this object becomes a compile error until you add a color. This is one of
the most useful patterns in TypeScript: lookup tables that **cannot fall out of sync** with a union. It is a
safer alternative to a `switch` whose `default` branch hides missing cases.

Pair it with `satisfies` to keep the literal value types while still checking completeness:

```ts
const ICONS = { todo: '○', 'in-progress': '◐', done: '●' } satisfies Record<Status, string>;
```

## String keys: a dictionary

With `string` as the key type, `Record` is just an index signature:

```ts
const scores: Record<string, number> = {};
scores.ada = 10;
// same as { [key: string]: number }
```

**Pitfall:** reads are typed as `number` even when the key is missing:

```ts
const missing = scores.nobody;   // type number, value undefined
missing.toFixed(2);              // runtime TypeError
```

Enable `noUncheckedIndexedAccess` to get `number | undefined` on reads, or type the dictionary as
`Partial<Record<string, number>>`, or use a `Map`, whose `get` returns `V | undefined`.

## Optional keys: `Partial<Record<K, V>>`

When only some keys of a union may be present (a cache, a group-by result), combine the two utilities:

```ts
const groups: Partial<Record<Status, string[]>> = { done: ['Ship'] };
groups.todo?.push('Plan'); // must handle undefined
```

## Record vs Map

| | `Record<K, V>` | `Map<K, V>` |
| --- | --- | --- |
| Keys | strings, numbers, symbols | any value, including objects |
| JSON friendly | yes | no |
| Exhaustiveness with unions | yes | no |
| Missing key reads | typed `V` (unsafe) | `V \| undefined` |
| Frequent add/delete | ok | optimized |

Use `Record` for static lookup tables and JSON-shaped data, `Map` for dynamic collections.

## Building a Record at runtime

TypeScript cannot know that a loop filled every key. Initialize every key explicitly, or build from a typed
list:

```ts
const STATUSES = ['todo', 'in-progress', 'done'] as const;
const counts = Object.fromEntries(STATUSES.map((status) => [status, 0])) as Record<Status, number>;
```

`Object.fromEntries` returns `{ [k: string]: T }`, so a cast is needed there; writing the literal object is
often simpler and fully checked.
