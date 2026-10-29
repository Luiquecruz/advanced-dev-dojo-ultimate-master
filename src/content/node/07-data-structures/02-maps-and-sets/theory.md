# Maps and Sets

Most backend data work is the same three moves: **look things up by key** (join orders with their customers), **group** (orders by status, events by day) and **deduplicate** (unique emails before sending a newsletter). Arrays can do all three, but only by scanning. `Map` and `Set` are hash tables built into the language: lookups, inserts and deletes are `O(1)` on average.

## Indexing: build once, look up many times

```ts
const usersById = new Map(users.map((user) => [user.id, user]));

for (const order of orders) {
  const customer = usersById.get(order.userId);
}
```

Building the index is `O(users)`; every lookup after that is `O(1)`. The alternative, `users.find(...)` inside the loop, is `O(orders × users)`. This is the in-memory version of a database index, and it is also how DataLoader-style batching (persistence module) joins rows after one `WHERE id IN (...)` query.

## Grouping

```ts
function groupBy<T, K>(items: readonly T[], key: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const groupKey = key(item);
    const group = groups.get(groupKey);
    if (group) group.push(item);
    else groups.set(groupKey, [item]);
  }
  return groups;
}
```

Modern runtimes ship this as `Map.groupBy(items, key)` and `Object.groupBy(items, key)` (Node 21+). Use the built-in when your Node version has it; knowing the loop matters because assistants still generate the quadratic `reduce` with spreads (`{ ...acc, [key]: [...(acc[key] ?? []), item] }`), which copies everything on each step.

## Deduplication and membership

```ts
const unique = [...new Set(emails.map((email) => email.trim().toLowerCase()))];
const blocked = new Set(blockedIds);
const allowed = requests.filter((request) => !blocked.has(request.userId));
```

A `Set` keeps insertion order, so `[...new Set(list)]` keeps the first occurrence of each value. Normalize before inserting: `Ada@Example.com ` and `ada@example.com` are different strings.

Node 22+ also has set algebra: `a.union(b)`, `a.intersection(b)`, `a.difference(b)`, `a.isSubsetOf(b)`. They are exactly what you need to sync memberships (which ids were added, which were removed).

## Map versus plain object

| | `Map` | `{}` object |
| --- | --- | --- |
| Key types | anything (numbers stay numbers, objects by reference) | strings and symbols only (`1` becomes `"1"`) |
| Order | insertion order | integer-like keys first, then insertion order |
| Size | `map.size` | `Object.keys(obj).length` (`O(n)`) |
| Prototype keys | none | `__proto__`, `constructor`, `toString` exist unless `Object.create(null)` |
| JSON | needs `Object.fromEntries(map)` | serializes directly |

Use a `Map` for dynamic keys, especially keys that come from users: writing `obj[userInput] = value` with `userInput === '__proto__'` is the root of **prototype pollution** bugs. Use plain objects for fixed shapes (records, DTOs, JSON responses).

## Pitfalls

- **Object keys compare by reference.** `map.get({ id: 1 })` never finds an entry stored with another `{ id: 1 }`. For composite keys build a string: `` `${tenantId}:${userId}` ``.
- **`NaN` and `-0`**: a `Map` treats all `NaN` as the same key and `-0` as `0`. Rarely matters, occasionally surprises.
- **Unbounded growth.** A module-level `Map` used as a cache keeps every entry forever: a memory leak in a long-running server. Bound it (the LRU lesson) or use a `WeakMap` when the key is an object whose lifetime you do not control (per-request metadata).
- **Iterating while mutating.** Deleting the current entry during `for...of` over a `Map` is safe; adding new keys makes the loop visit them too.

## Complexity

| Operation | Array | Set / Map |
| --- | --- | --- |
| membership / lookup by key | `O(n)` | `O(1)` average |
| insert | `O(1)` at the end | `O(1)` average |
| delete by value or key | `O(n)` | `O(1)` average |
| ordered iteration | `O(n)` | `O(n)` (insertion order) |
| memory | compact | roughly 2–4× an array |

## When to choose it

Reach for a `Map` when you look items up by key more than once, when you join two lists, or when you group; reach for a `Set` for membership checks and deduplication over data that grows. Keep an **array** when you only iterate, when order and indexes matter, or when the collection is small and fixed (`['admin', 'editor'].includes(role)` is fine). When the data lives in a database, prefer doing the join or the `DISTINCT` there; build in-memory indexes for data you already fetched.

## Working with AI

Ask for "an index built once with a `Map`" explicitly when joining lists, and give realistic sizes. Review generated code for:

- `find`, `filter`, `includes` or `indexOf` inside a loop over another list.
- `reduce` that spreads the accumulator (`{ ...acc }`, `[...acc]`).
- Plain objects keyed by user input (`counts[req.query.key]`): prototype pollution risk.
- Object or array keys in a `Map` that should be strings.
- Deduplication without normalization (case, whitespace).
- Module-level maps that only ever grow.
