`first, *middle, last = items` already does the job for any iterable, including generators, and raises `ValueError` when there are fewer than two values. The starred name is always a list.
---
`{**layer_one, **layer_two}` builds a new dict where the right side wins. With a variable number of layers, loop and merge into a fresh dict, or unpack in a comprehension: `{key: value for layer in layers for key, value in layer.items()}`.
---
`[(b, a) for a, b in pairs]` unpacks each pair in the loop header.
