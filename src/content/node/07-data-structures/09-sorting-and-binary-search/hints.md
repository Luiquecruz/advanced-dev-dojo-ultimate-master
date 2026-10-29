`sortOrders`: copy with `[...orders]` (or use `toSorted`) so the caller's array is untouched, and give `sort` a comparator that compares `PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]` first.
---
Chain the tie-breakers with `||`: a difference of `0` is falsy, so `rankDiff || a.createdAt - b.createdAt || a.id - b.id` only moves to the next key on a tie.
---
`lowerBound` keeps a half-open range: `let low = 0, high = items.length`. While `low < high`, take `middle = (low + high) >>> 1`; if `key(items[middle]) < target` the answer is to the right (`low = middle + 1`), otherwise it is `middle` or to its left (`high = middle`). Return `low`.
---
`eventsBetween` is one line: `events.slice(lowerBound(events, from, (event) => event.at), lowerBound(events, to, (event) => event.at))`. The second bound excludes `to` because it points at the first event with `at >= to`.
