Write two helpers first: a dot product, `a.Zip(b, (x, y) => x * y).Sum()`, and a length, `Math.Sqrt(Dot(a, a))`. Cosine similarity is the dot product divided by the product of both lengths; check that product for `0` before dividing, because `0.0 / 0.0` is `double.NaN`, not an exception.
---
For the tie-break, sort with `OrderByDescending(entry => entry.Score)` and then `ThenBy(entry => entry.Id, StringComparer.Ordinal)`: the second key only decides between equal scores. `Take(k)` already stops early when there are fewer than `k` items.
---
Put the centroid ranking in one method that returns centroid indexes sorted by similarity (index ascending on a tie). `Add` uses its first index; `Search` takes the first `nprobe` indexes, concatenates those lists with `SelectMany` and hands them to `ExactSearch`.
