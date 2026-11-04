In Python, a variable is a **name bound to an object**, not a box that holds a value. Assignment attaches a label; it never copies.

```py
first = [1, 2]
second = first        # a second name for the SAME list
second.append(3)
print(first)          # [1, 2, 3]
print(first is second)  # True
```

`is` asks "same object?". Arguments work the same way: calling `add(cart, item)` binds the parameter `cart` to the list the caller owns.

## Coming from TypeScript and JavaScript

JavaScript objects and arrays behave like this too, so the model is not new. What changes is **how visible and how common it is**:

```ts
// JavaScript
const a = [1, 2];
const b = a;
b.push(3);          // a is [1, 2, 3] as well
```

- Python applies the rule to *every* type, and the operators look innocent. `+=` on a list **mutates** it in place, while `x = x + [item]` **rebinds** the name to a new list.
- `[[]] * 3` does not build three lists. It repeats one reference three times.
- A function that rebinds its parameter changes nothing for the caller; a function that mutates it changes the caller's object.

```py
def grow(items):
    items += [4]        # mutates the caller's list

def rebind(items):
    items = items + [4]  # builds a new list; the caller sees nothing
```

## How it works

- `list.append`, `extend`, `+=`, `sort` mutate the object. `+`, `sorted`, slicing and `list(x)` build a **new** object.
- `list(x)`, `x.copy()` and `x[:]` copy the list but not the elements inside it (a *shallow* copy, covered in lesson 05).
- `id(obj)` returns an identity, but reading raw ids is never a good test: use `is`.
- Three decisions always exist for a function that receives a mutable argument: mutate it, return a new object, or both. State which one in the docstring and keep it consistent.

## Pitfalls

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
