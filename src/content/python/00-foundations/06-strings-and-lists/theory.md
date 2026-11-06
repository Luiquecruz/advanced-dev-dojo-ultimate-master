A **string** (`str`) is a sequence of characters and a **list** is a sequence of any objects. Both are ordered: every item has a position, its **index**, counted from 0. A negative index counts from the end.

```py
name = "Ada Lovelace"
print(name[0])          # A
print(name[-1])         # e
print(len(name))        # 12

scores = [70, 95, 88]
scores.append(60)       # scores is now [70, 95, 88, 60]
print(scores[1])        # 95
print(len(scores))      # 4
```

## How it works

**String methods never change the string.** A string never changes after it is created (it is *immutable*): methods that transform text hand back a new string and leave the original alone, and others return a different kind of value, such as `True` from `startswith` or a list from `split`:

```py
raw = "  Hello, World!  "
clean = raw.strip()                    # "Hello, World!": spaces removed at both ends
print(clean.lower())                   # hello, world!
print(clean.upper())                   # HELLO, WORLD!
print(clean.replace("World", "Ada"))   # Hello, Ada!
print(clean.startswith("Hello"))       # True
print("ada   lovelace".split())        # ['ada', 'lovelace']: splits on any run of whitespace
print("-".join(["a", "b", "c"]))       # a-b-c
print("hi!?".strip("!?"))              # hi: strip removes any of the given characters
```

`raw` is still `"  Hello, World!  "` afterwards. To keep a result, bind it to a name: `raw = raw.strip()`.

**Slicing** copies a part of a sequence. `seq[start:stop]` runs from `start` up to, but not including, `stop`. Either side may be left out, and an optional third number is the step:

```py
letters = "python"
print(letters[0:2])      # py
print(letters[2:])       # thon: from index 2 to the end
print(letters[:-1])      # pytho: everything but the last
print(letters[-2:])      # on: the last two
print(letters[::-1])     # nohtyp: step -1 walks backwards
print(letters[10:20])    # an empty string: a slice never raises
```

Indexing past the end, `letters[10]`, raises `IndexError`; a slice past the end only gives fewer items. A slice of a list is a **new** list, so `items[:]` is a quick copy.

**Lists change in place.** Their methods modify the list itself and most of them return `None`:

```py
tasks = ["write", "test"]
tasks.append("ship")            # adds one item at the end
tasks.extend(["rest", "plan"])  # adds every item of another list
last = tasks.pop()              # removes and returns the last item: "plan"
first = tasks.pop(0)            # removes and returns the item at index 0: "write"
tasks.remove("rest")            # removes the first item equal to "rest" (ValueError if absent)
tasks[0] = "review"             # replaces the item at index 0
print(tasks)                    # ['review', 'ship']
```

**Sorting** comes in two forms. `items.sort()` reorders the list itself and returns `None`. `sorted(items)` builds a new list and leaves `items` as it was. Both accept `reverse=True` and the `key=` function from the previous lesson.

**A list comprehension** is a short loop that builds a list, written `[expression for item in iterable if condition]`:

```py
words = ["Tea", "", "Cake"]
lowered = [word.lower() for word in words if word]   # ['tea', 'cake']
```

An empty string counts as false in a condition, so `if word` skips it. The comprehension does exactly what this loop does:

```py
lowered = []
for word in words:
    if word:
        lowered.append(word.lower())
```

## Common mistakes

**Sorting the caller's list.** `sort()` changes the list that was passed in, so the caller finds their data reordered:

```py
def highest(scores, n):
    scores.sort(reverse=True)                  # wrong: reorders the caller's list
    return scores[:n]

def highest(scores, n):
    return sorted(scores, reverse=True)[:n]    # right: sorts a new list
```

**Taking the last `n` items with `items[-n:]`.** When `n` is 0, `-0` is just `0`, and `items[0:]` is the whole list. Compute where the slice starts instead:

```py
items[-n:]                        # n == 0 gives every item
items[max(len(items) - n, 0):]    # n == 0 gives [], a large n gives every item
```

**Expecting a string method to change the string.** A line such as `name.strip()` on its own computes a new string and throws it away. Keep the result: `name = name.strip()`.

## When to choose it

- A **string** for text. Try its methods (`strip`, `split`, `join`, `lower`, `replace`) before writing a loop over characters.
- A **list** for an ordered collection that grows, shrinks or contains repeats.
- **`sorted()` and slices** when the list belongs to someone else, such as a function argument; `.sort()` and the other changing methods on a list your own code created.
- A **comprehension** when a loop only builds one list; a plain `for` loop when the body does more, such as printing or stopping early.
