Model a small shirt inventory:

1. `type ShirtSize` — the union `'small' | 'medium' | 'large'`.
2. `const shirtPrices` — a `Record<ShirtSize, number>` with `small: 19.9`, `medium: 21.9`, `large: 23.9`.
3. `type StockLevels` — a dictionary mapping any SKU `string` to a `number` of units.
4. `totalUnits(stock: StockLevels): number` — sum of every value (`0` for an empty dictionary).
5. `restock(stock: StockLevels, sku: string, amount: number): StockLevels` — returns a **new**
   dictionary where `sku` has `amount` more units (a missing SKU starts at `0`).

```ts
totalUnits({ 'KB-01': 3, 'MS-02': 4 });  // 7
restock({ 'KB-01': 3 }, 'KB-01', 2);     // { 'KB-01': 5 }
restock({ 'KB-01': 3 }, 'HD-03', 1);     // { 'KB-01': 3, 'HD-03': 1 }
```
