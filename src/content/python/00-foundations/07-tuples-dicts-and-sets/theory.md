A **tuple** is a fixed sequence, a **dict** maps keys to values, and a **set** holds each item only once. Together with lists they hold most of the data a program keeps.

```py
point = (3, 4)                          # tuple: a fixed group of values
prices = {"tea": 250, "cake": 400}      # dict: key -> value
tags = {"python", "beginner"}           # set: unique items, no order
print(point[0])                         # 3
print(prices["tea"])                    # 250
print("python" in tags)                 # True
```

## How it works

**Tuples** are made by the commas; the parentheses only group them. A tuple can be indexed and sliced like a list, but it cannot be changed, which makes it the right shape for values that belong together, such as two results returned by one function. Unpack it into names with `name, price = pair`. A tuple with one item needs a trailing comma: `("tea",)`. Tuples compare item by item: `(2, "b") < (2, "c")` because the first items tie and `"b"` comes before `"c"`.

**Dicts** find a value by its key. Keys must be *hashable*: values that never change, such as strings, numbers, or tuples whose items are hashable too. A list cannot be a key, and neither can a tuple that holds a list.

```py
stock = {"tea": 3}
stock["cake"] = 5               # adds a key, or replaces its value
stock["tea"] += 1               # reads 3, adds one, stores 4
print(stock.get("milk"))        # None: get never raises
print(stock.get("milk", 0))     # 0: a default of your choice
print("milk" in stock)          # False: `in` checks the keys
stock.update({"milk": 2})       # adds or replaces several keys
del stock["cake"]               # removes a key
for name, count in stock.items():
    print(name, count)          # tea 4, then milk 2
print(stock["jam"])             # KeyError: 'jam'
```

Reading a key that is not there with `stock["jam"]` raises `KeyError`, and so does `del` on a missing key. A dict remembers insertion order, so a loop visits the keys in the order they were first added. `items()` gives each entry as a `(key, value)` tuple; `keys()` and `values()` give one side only.

**Sets** keep each item once and answer `in` quickly, however many items they hold. Create an empty set with `set()`, because `{}` is an empty **dict**.

```py
seen = set()
for word in ["tea", "cake", "tea"]:
    seen.add(word)              # adding an item twice keeps one copy
print(len(seen))                # 2
print(sorted(seen))             # ['cake', 'tea']
print({1, 2} | {2, 3})          # {1, 2, 3}: union
print({1, 2} & {2, 3})          # {2}: intersection
```

A set has no order, so printing one directly may show its items in any order. Sort it before showing it to a person.

**Sorting by several things.** `sorted` compares tuples item by item, so a `key` function that returns a tuple sorts by its first item and breaks ties with the next. A minus sign in front of a number reverses that part of the order:

```py
counts = {"tea": 3, "cake": 5, "jam": 3}
ranked = sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))
print(ranked)                   # [('cake', 5), ('jam', 3), ('tea', 3)]
```

The count goes from high to low, and words with the same count go from A to Z.

**A preview: some iterables run out.** `zip`, `enumerate` and similar objects hand out each item once. A second loop over the same `zip` object finds nothing; module 05, Iterators and Generators, explains why. Wrap it in `list(...)` when you need the items twice.

## Common mistakes

**Adding one to a key that does not exist yet.** `counts[word] += 1` has to read `counts[word]` first, and the first time a word appears there is nothing to read:

```py
counts = {}
for word in words:
    counts[word] += 1                         # wrong: KeyError on the first word

counts = {}
for word in words:
    counts[word] = counts.get(word, 0) + 1    # right: a new word starts from 0
```

**Writing `{}` for an empty set.** `{}` is a dict, and a dict has no `add` method, so `seen = {}` followed by `seen.add("tea")` raises `AttributeError: 'dict' object has no attribute 'add'`. Write `seen = set()`.

## When to choose it

- A **tuple** for a fixed group of values: two results from one function, or a dict key made of two parts.
- A **dict** to look things up by a key or to count. Use `get(key, default)` when a missing key is normal, and `d[key]` when a missing key is a bug that should raise.
- A **set** to remove duplicates or to test membership; sort it before showing it.
- A **list** when order matters and the same item may appear more than once.
