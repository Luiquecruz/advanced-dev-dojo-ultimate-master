1. Start with the comparator: translate the priority names into numbers with the rank table, because comparing the strings would sort them alphabetically (`high`, `low`, `normal`).
2. Chain the keys with `||` and finish with the unique `id`, so every pair of different orders has a defined order.
3. Sort a copy: `sort` works in place, and the caller may still use the original array.
4. For `lowerBound`, write down the invariant before the loop: indexes before `low` hold keys `< target`, indexes from `high` on hold keys `>= target`. Each step reads one element and halves `[low, high)`.
5. Moving `high` to `middle` (not `middle - 1`) keeps the first of several equal keys inside the range, which is why duplicates return the first index.
6. Express the range query as two lower bounds: the start of `from` and the start of `to`. Slicing between them returns exactly `[from, to)` and reads only the elements returned.
