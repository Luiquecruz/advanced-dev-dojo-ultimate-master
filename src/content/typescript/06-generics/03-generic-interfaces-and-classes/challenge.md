Build a small typed repository.

1. Declare `interface Page<T>` with `items: T[]`, `page: number` and `total: number` (the total number of
   stored items).
2. Implement `class Repository<T extends { id: number }>`:
   - `add(item: T): void` — stores the item (adding an item with an existing `id` replaces it)
   - `findById(id: number): T | undefined`
   - `all(): readonly T[]` — every item in insertion order
   - `where(predicate: (item: T) => boolean): T[]`
   - `paginate(page: number, size: number): Page<T>` — pages start at `1`

```ts
const users = new Repository<{ id: number; name: string }>();
users.add({ id: 1, name: 'Ada' });
users.findById(1)?.name;  // "Ada"
users.paginate(1, 10);    // { items: [{ id: 1, name: 'Ada' }], page: 1, total: 1 }
```
