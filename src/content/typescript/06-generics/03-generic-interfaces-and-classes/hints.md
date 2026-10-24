Start with `interface Page<T> { items: T[]; page: number; total: number }` and `class Repository<T extends { id: number }>`.
---
Replace every `unknown` inside the class with `T`, including the map: `new Map<number, T>()`. `add` becomes `this.#items.set(item.id, item)`.
---
For pagination: `const start = (page - 1) * size;` then `items.slice(start, start + size)`, and return `{ items, page, total: allItems.length }`.
