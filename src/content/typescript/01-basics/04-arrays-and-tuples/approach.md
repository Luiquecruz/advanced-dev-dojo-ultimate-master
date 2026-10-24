1. Replace the loose `(string | number)[]` with a labeled tuple so each position has its own type.
2. Notice that `parseScore` now has a precise return type without changing its body: the returned literal matches the tuple.
3. Mark the `entries` parameter as `readonly ScoreEntry[]`; the compiler now forbids in-place sorting.
4. Produce a sorted copy in descending score order with `toSorted` or a spread followed by `sort`.
5. Keep the first `count` entries with `slice` and map each tuple to its player name.
