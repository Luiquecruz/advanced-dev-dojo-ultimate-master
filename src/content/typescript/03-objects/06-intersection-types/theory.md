An **intersection type** `A & B` describes a value that is `A` **and** `B` at the same time, so it has
every member of both. It is the type alias counterpart of `interface ... extends`:

```ts
type Identified = { id: string };
type Priced = { priceInCents: number };

type CatalogItem = Identified & Priced & { title: string };

const item: CatalogItem = { id: 'book-1', priceInCents: 2990, title: 'Dune' };
```

Intersections shine when you compose small "trait" types, or when you add fields to a type you do not own:

```ts
type WithTimestamps<T> = T & { createdAt: Date; updatedAt: Date };
```

Pitfall: when both sides declare the **same property with incompatible types**, TypeScript does not report an
error at the declaration. The property type becomes `string & number`, which is `never`, and you only
discover it when nothing can be assigned:

```ts
type Broken = { code: string } & { code: number };
type Code = Broken['code']; // never
```

With `interface Child extends Parent` the same conflict is reported immediately, which is one reason to
prefer `extends` for object hierarchies and `&` for ad-hoc composition.
