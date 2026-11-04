`deque(maxlen=limit)` already drops the oldest item. For `RecentItems`, `add` is `append` and `items` is `list(...)`.
---
A `Counter` returns `0` for unknown keys, so `available` needs no special case. Check the stock before subtracting, and remember that a Counter keeps zero entries in its dict: filter them in `snapshot`.
---
`ChainMap(cli, env, defaults)` searches left to right and writes to the first mapping. Pass the original dicts, not copies, so the write lands in `cli`.
