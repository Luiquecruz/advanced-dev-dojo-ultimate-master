`first, *middle, last = items` already does the job for any iterable, including generators, and raises `ValueError` when there are fewer than two values. The starred name is always a list.
---
`{**layer_one, **layer_two}` builds a new dict where the right side wins. With a variable number of layers, start from an empty dict and loop: `merged = {**merged, **layer}` builds a new dict each time, and no layer is ever the target of a change.
---
`[(b, a) for a, b in pairs]` unpacks each pair in the loop header.
