Move the parameter type into a constraint: `function longest<T extends { length: number }>(a: T, b: T): T`.
---
`byPriority` follows the same idea with `T extends { priority: number }` and `items: readonly T[]`. `readonly` arrays have no `sort`, which is a good reminder to copy first: `[...items].sort(...)`.
---
`totalBy<T>(items: readonly T[], select: (item: T) => number)` and `items.reduce((sum, item) => sum + select(item), 0)`.
