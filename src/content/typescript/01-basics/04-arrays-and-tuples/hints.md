A labeled tuple looks like `[player: string, score: number]`. Add `readonly` in front of `ScoreEntry[]` in the parameter of `topPlayers`.
---
On a `readonly` array `sort` does not exist. Use `toSorted` (returns a new array) or sort a copy: `[...entries].sort(...)`.
---
Sort with `(a, b) => b[1] - a[1]` for descending scores, then `slice(0, count)` and `map` each entry to `entry[0]`.
