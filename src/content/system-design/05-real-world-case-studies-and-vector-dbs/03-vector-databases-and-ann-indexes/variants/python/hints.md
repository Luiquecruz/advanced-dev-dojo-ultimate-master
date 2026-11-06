Write two helpers first: a dot product, `sum(x * y for x, y in zip(a, b))`, and a length, `math.sqrt(dot(a, a))`. Cosine similarity is the dot product divided by the product of both lengths; check that product for `0` before dividing, or Python raises `ZeroDivisionError`.
---
For the tie-break, sort with a key that puts the highest score first and the smallest id next: `key=lambda entry: (-entry["score"], entry["id"])`. Tuples compare element by element, so the id only decides between equal scores.
---
Put the centroid ranking in one function that returns centroid indexes sorted by similarity (index ascending on a tie). `add` uses its first index; `search` takes the first `nprobe` indexes, concatenates those lists and hands them to `exact_search`.
