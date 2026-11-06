In Python, a variable is a **name bound to an object**, not a box that holds a value. Assignment attaches a label; it never copies.

```py
first = [1, 2]
second = first        # a second name for the SAME list
second.append(3)
print(first)          # [1, 2, 3]
print(first is second)  # True
```

`is` asks "same object?". Two names bound to one object are called **aliases**: a change made through one name is visible through every other name. Arguments work the same way: calling `add(cart, item)` binds the parameter `cart` to the list the caller owns.

## How it works

The rule applies to every type, and two kinds of operation look alike but do different things:

- **Mutating** changes the object itself: `list.append`, `extend`, `sort`, `del items[0]` and `+=` on a list. Every alias sees the change.
- **Rebinding** points a name at another object: `x = x + [item]`, `x = sorted(x)`. Only that one name moves; other aliases keep the old object.

```py
def grow(items):
    items += [4]        # mutates the caller's list

def rebind(items):
    items = items + [4]  # builds a new list; the caller sees nothing
```

A function that rebinds its parameter changes nothing for the caller; a function that mutates it changes the caller's object.

- `+`, `sorted`, slicing and `list(x)` build a **new** object.
- `list(x)`, `x.copy()` and `x[:]` copy the list but not the elements inside it (a *shallow* copy, covered in lesson 05).
- `[[]] * 3` does not build three lists. It repeats one reference three times.
- `id(obj)` returns an identity, but reading raw ids is never a good test: use `is`.
- Three decisions always exist for a function that receives a mutable argument: mutate it, return a new object, or both. State which one in the docstring and keep it consistent.

## Common mistakes

**Assigning a list to a new name and expecting a copy.** `saved = cart` makes `saved` an alias, so every later `cart.append(...)` shows up in the "saved" version too. Build a new list instead:

```py
saved = cart          # wrong: a second name for the same list
saved = list(cart)    # right: a new list with the same items
```

**Repeating one inner list.** `[[]] * 3` puts the same list in every position, so appending to one row appends to all of them:

```py
carts = [[]] * 3
carts[0].append("book")
print(carts)   # [['book'], ['book'], ['book']]  one list, three names

carts = [[] for _ in range(3)]   # the expression runs once per element
```

## When to choose it

- **Mutate in place** when the caller owns the object and expects the change (`list.append`, a function named `add_*`).
- **Return a new object** for pure helpers, values shared between components and anything used as input by several callers.
- **Copy at the boundary** when you store an argument for later: `self.items = list(items)` keeps later changes from leaking in.
- Avoid functions that do both silently, for example mutating *and* returning a different object.
