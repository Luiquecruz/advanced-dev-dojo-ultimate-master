`type StockLevels = { [sku: string]: number }` and `Record<string, number>` are both valid.
---
Annotate the constant: `const shirtPrices: Record<ShirtSize, number> = { ... }`.
---
For restock, read the current amount with `stock[sku] ?? 0` and return `{ ...stock, [sku]: current + amount }`.
