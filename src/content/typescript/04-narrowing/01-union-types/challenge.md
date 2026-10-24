Implement three small helpers that accept union types.

1. `type Id = string | number;` (already declared).
2. `formatId(id: Id): string`:
   - numbers are padded with zeros to 6 digits: `formatId(42)` → `"000042"`
   - strings are trimmed and uppercased: `formatId(' ab-7 ')` → `"AB-7"`
3. `normalizeTags(input: string | string[]): string[]`:
   - a string is split by commas, each part trimmed, empty parts removed: `"a, b,,c"` → `["a", "b", "c"]`
   - an array is returned with each tag trimmed and empty tags removed
4. `totalQuantity(values: (number | string)[]): number` sums the values, converting numeric strings with `Number`: `[1, '2', 3]` → `6`.

The signatures must stay exactly as written.
