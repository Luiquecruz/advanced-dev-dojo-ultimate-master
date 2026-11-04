The `collections` module holds containers for jobs the built-in types do awkwardly. Four of them cover most real code.

## `deque`: a queue with fast ends

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

## `Counter`: counting

```py
from collections import Counter

stock = Counter(pen=3, ink=1)
stock["pen"] += 2          # missing keys count as 0, no KeyError
stock.update(["ink", "ink"])
stock.most_common(1)       # [('pen', 5)]
stock + Counter(pen=1)     # arithmetic keeps only positive counts
```

Reading a missing key returns `0` and does **not** insert it. The binary operators (`+`, `-`, `&`, `|`) drop zero and negative counts, but `stock[key] -= n` and `stock.subtract(...)` keep them in the underlying dict, so filter them when you report.

## `defaultdict`: a default for missing keys

```py
from collections import defaultdict

graph = defaultdict(list)
graph["a"].append("b")     # no "if key not in graph" branch
```

The factory (`list`, `set`, `int`) runs on a missing key and **inserts** the result. Reading with `[]` therefore grows the dict; use `.get` or `in` when you only want to look.

## `ChainMap`: layered lookups

```py
from collections import ChainMap

config = ChainMap({"debug": True}, {"debug": False, "port": 80}, {"port": 8080})
config["port"]             # 80: first mapping that has the key
config["port"] = 1         # writes go to the FIRST mapping only
```

`ChainMap` does not copy: it searches the mappings in order, which makes it ideal for command line, environment and default layers.

## Coming from TypeScript and JavaScript

- JS arrays used as queues (`shift`) and manual `obj[key] ??= []` become `deque` and `defaultdict`.
- There is no built-in `Counter`: JS code uses `reduce` into a `Map`.
- Layering with `{ ...defaults, ...env, ...cli }` **copies** every time. `ChainMap` is a view, so a change in a lower layer is visible immediately.

## When to choose it

- **`deque`** for queues, sliding windows and bounded history.
- **`Counter`** for tallies; **`defaultdict`** for grouping and adjacency lists.
- **`ChainMap`** for layered configuration with a single writable layer.
- Plain `dict` and `list` otherwise. `namedtuple` and `OrderedDict` are mostly historical: prefer `dataclass` and `dict`.
