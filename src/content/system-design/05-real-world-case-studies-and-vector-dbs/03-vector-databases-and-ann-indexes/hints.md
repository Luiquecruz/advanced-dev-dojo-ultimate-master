Write two helpers first: `dot(a, b)` and `norm(a) = Math.sqrt(dot(a, a))`. Cosine similarity is the dot product divided by `norm(a) * norm(b)`; check that product for `0` before dividing.
---
For the tie-break, sort with `right.score - left.score || compareIds(left.id, right.id)`: when the scores are equal the first expression is `0` and the id comparison decides.
---
Put the centroid ranking in one function that returns centroid indexes sorted by similarity (index ascending on a tie). `add` uses its first index; `search` takes the first `nprobe` indexes, concatenates those lists with `flatMap` and hands them to `exactSearch`.
