A log tool for a billing service sends events in chunks, reports how long the service stayed in each state, keeps running totals of charges and lists every state change. The starter slices lists and counts statuses in a dict, so it fails on generators and merges runs that are apart. Rewrite the four functions in `main.py` with `itertools`.

Events are dicts with a `"status"` key and other keys the functions ignore, such as a timestamp that differs on every event. Every function accepts any iterable, including a generator.

## `batches(records, size)`

- Return a **lazy iterator** of tuples of `size` records, in order, with a shorter last tuple when the records do not divide evenly (`itertools.batched`).
- Records are read only as each batch is requested: getting the first batch of 4 reads exactly 4 records.
- `size < 1` raises `ValueError` (at the latest when the first batch is requested).

## `runs(events)`

Return a list of `(status, count)` tuples, one per **run** of consecutive events with the same status, in order (`itertools.groupby` with a key on the status, since events with the same status differ in their other keys). A status that comes back later starts a new run: statuses `ok, ok, error, ok` give `[("ok", 2), ("error", 1), ("ok", 1)]`.

## `running_totals(amounts)`

Return a list with the cumulative sum after each amount (`itertools.accumulate`): `[5, 10, -3]` gives `[5, 15, 12]`. No leading zero; an empty input gives `[]`.

## `transitions(statuses)`

`statuses` is an iterable of strings. Return a list of `(before, after)` tuples for every pair of **adjacent** statuses that differ, in order (`itertools.pairwise`). No change, or fewer than two statuses, gives `[]`.
