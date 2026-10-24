Sometimes you do not know the property names ahead of time: a cache keyed by id, stock levels keyed by SKU,
translations keyed by locale. An **index signature** describes "any key of this type maps to a value of
that type":

```ts
type WordCounts = { [word: string]: number };

const counts: WordCounts = {};
counts['hello'] = 1;      // any string key is accepted
counts['world'] = 'two';  // Error: Type 'string' is not assignable to type 'number'.
```

The built-in `Record<Keys, Value>` utility says the same thing more compactly. With `string` as the key it
is an open dictionary; with a **union of literals** it becomes a closed map that must contain every key:

```ts
type Locale = 'en' | 'pt' | 'es';
const greetings: Record<Locale, string> = { en: 'Hello', pt: 'Olá', es: 'Hola' };
// Omitting 'es' would be a compile error: Property 'es' is missing.
```

Iterate dictionaries with `Object.keys`, `Object.values` or `Object.entries`:

```ts
const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
```

Pitfall: with an open index signature, `counts['typo']` is typed as `number` even though at runtime it is
`undefined`. Check with `key in counts` or use `?? 0` when a key might be missing (the
`noUncheckedIndexedAccess` compiler option makes this explicit by adding `| undefined`).
