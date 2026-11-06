The `collections` module holds containers for jobs the built-in types do awkwardly. Four of them cover most real code.

## How it works

### `deque`: a queue with fast ends

```py
from collections import deque

recent = deque(maxlen=3)
for event in ["a", "b", "c", "d"]:
    recent.append(event)
print(list(recent))        # ['b', 'c', 'd']  the oldest fell off

queue = deque([1, 2, 3])
queue.popleft()            # 1, constant time
queue.appendleft(0)
```

`list.pop(0)` shifts every remaining item. A `deque` adds and removes at **both ends** in constant time, and `maxlen` gives a bounded buffer for free.

### `Counter`: counting

```py
from collections import Counter

stock = Counter(pen=3, ink=1)
stock["pen"] += 2          # missing keys count as 0, no KeyError
stock.update(["ink", "ink"])
stock.most_common(1)       # [('pen', 5)]
stock + Counter(pen=1)     # arithmetic keeps only positive counts
```

Reading a missing key returns `0` and does **not** insert it. The binary operators (`+`, `-`, `&`, `|`) drop zero and negative counts, but `stock[key] -= n` and `stock.subtract(...)` keep them in the underlying dict, so filter them when you report.

### `defaultdict`: a default for missing keys

```py
from collections import defaultdict

graph = defaultdict(list)
graph["a"].append("b")     # no "if key not in graph" branch
```

The factory (`list`, `set`, `int`) runs on a missing key and **inserts** the result. Reading with `[]` therefore grows the dict; use `.get` or `in` when you only want to look.

### `ChainMap`: layered lookups

```py
from collections import ChainMap

config = ChainMap({"debug": True}, {"debug": False, "port": 80}, {"port": 8080})
config["port"]             # 80: first mapping that has the key
config["port"] = 1         # writes go to the FIRST mapping only
```

`ChainMap` does not copy: it searches the mappings in order, which makes it ideal for command line, environment and default layers. Merging the same layers with `{**defaults, **env, **cli}` builds a new dict once: later changes to `defaults` never reach it, and writes to it never reach `cli`. A `ChainMap` is a view, so a change in any layer is visible immediately, unless an earlier layer holds the same key and hides it.

## Common mistakes

**Reporting a `Counter` with `dict(counter)`.** `counter[key] -= n` keeps the key even when its count reaches zero or below, so a plain copy reports items that are gone. Filter the counts when you build the report:

```py
stock = Counter(pen=2, ink=1)
stock["ink"] -= 1
dict(stock)                                          # wrong: {'pen': 2, 'ink': 0}
{sku: count for sku, count in stock.items() if count > 0}   # right: {'pen': 2}
```

**Reading a `defaultdict` to check for a key.** `groups["x"]` inserts an empty value for `"x"`; use `"x" in groups` or `groups.get("x")` when you only want to look.

## When to choose it

- **`deque`** for queues, sliding windows and bounded history.
- **`Counter`** for tallies; **`defaultdict`** for grouping and adjacency lists.
- **`ChainMap`** for layered configuration with a single writable layer.
- Plain `dict` and `list` otherwise. `namedtuple` and `OrderedDict` are mostly historical: prefer `dataclass` and `dict`.
