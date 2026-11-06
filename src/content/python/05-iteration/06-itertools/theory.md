`itertools` is a set of building blocks that take any iterable and return a **lazy iterator**. Each one names a loop shape you would otherwise write by hand: chunk, window, run, running total, flatten one level, slice.

```py
from itertools import accumulate, batched, chain, count, groupby, islice, pairwise

days = [[3, 5], [2], [7, 1]]
amounts = chain.from_iterable(days)          # 3, 5, 2, 7, 1, produced lazily
print(list(accumulate(amounts)))             # [3, 8, 10, 17, 18]
print(list(batched(range(5), 2)))            # [(0, 1), (2, 3), (4,)]
print(list(pairwise("abc")))                 # [('a', 'b'), ('b', 'c')]
print([(key, len(list(group))) for key, group in groupby("aabccc")])
                                             # [('a', 2), ('b', 1), ('c', 3)]
print(list(islice(count(10), 3)))            # [10, 11, 12]: a slice of an endless iterator
```

## How it works

- Every result is an iterator: lazy and one-shot. Wrap it in `list()` when you need it twice.
- `chain.from_iterable(iterables)` flattens one level, pulling the outer iterable lazily; `chain(*iterables)` unpacks the outer iterable up front.
- `islice(iterable, start, stop, step)` slices any iterator. It accepts no negative indexes, and it consumes the items it skips.
- `groupby(iterable, key)` starts a new group **every time the key changes**, so it yields one `(key, group)` pair per run of equal keys, where `group` is an iterator sharing the underlying input. Advancing to the next pair empties the previous group, so `list(groupby(data))` leaves every group empty: consume or copy each group before moving on.
- `accumulate(iterable, func=operator.add, *, initial=None)` yields running results; `initial` adds a leading value.
- `pairwise(iterable)` yields overlapping pairs: `n - 1` pairs for `n` items, none for fewer than two.
- Slicing (`items[start:start + n]` for chunks, `zip(items, items[1:])` for neighbors) needs a sequence and copies it. `batched` and `pairwise` work on any iterable, generators and files included, and never copy the whole input (`batched` still builds one tuple per batch).
- `batched(iterable, n, *, strict=False)` yields tuples of `n` items and a shorter last tuple. It reads only enough input to fill each batch. `n < 1` raises `ValueError`, and `strict=True` raises `ValueError` when the last batch is short.
- `tee(iterable, n=2)` splits one iterator into `n` independent ones by buffering what the slower ones have not read yet. Do not touch the original afterwards, and prefer `list()` when one consumer reads everything before the other starts.

Before `batched` existed, chunking an iterator looked like `iter(lambda: tuple(islice(iterator, n)), ())`, the two-argument `iter()` from lesson 02.

`pairwise` arrived in Python 3.10, `batched` in 3.12 and its `strict=` flag in 3.13. Python 3.14 removed `copy`, `deepcopy` and `pickle` support from itertools iterators (deprecated since 3.12): use `tee` to fork one.

## Common mistakes

**Expecting `groupby` to collect every item with the same key.** It groups only neighbors: a key that comes back later starts a new group. That is what a run report needs, and what totals per key do not. Sorting first turns runs into totals, so pick the tool for the question:

```py
from collections import Counter
from itertools import groupby

statuses = ["ok", "ok", "error", "ok"]

# wrong for runs: sorting first merges the runs that are apart
[(key, len(list(group))) for key, group in groupby(sorted(statuses))]
# [('error', 1), ('ok', 3)]

# right for runs: group the data in its original order
[(key, len(list(group))) for key, group in groupby(statuses)]
# [('ok', 2), ('error', 1), ('ok', 1)]

# right for totals per key, in any order
Counter(statuses)   # Counter({'ok': 3, 'error': 1})
```

## When to choose it

- **`itertools`** when a step is a standard shape (chunk, window, run, running total, one-level flatten, slice of an iterator): the name states the intent, the iterator stays lazy and the loop runs in C.
- **`groupby`** for runs, or for data already sorted by the key. A `dict`, `defaultdict` or `Counter` for totals per key in any order.
- **`batched`** for bulk writes and API calls in chunks; a short last batch is normal, and `strict=True` makes it an error.
- **`tee`** rarely: when both consumers read everything, a list is simpler and often faster.
- **A plain loop** when chaining several tools makes one expression hard to read.
