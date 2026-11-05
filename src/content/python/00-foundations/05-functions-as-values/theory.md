In Python a function is a **value**, like a number or a text. The name in `def double(n):` refers to the function, and you can pass that value to another function, return it, or store it under another name. Writing the name **without parentheses** refers to the function; adding `()` calls it:

```py
def double(n):
    return n * 2

action = double        # no call: a second name for the same function
print(action(5))       # 10
print(double)          # <function double at 0x...>
```

## How it works

**Passing a function.** `sorted(items)` returns a **new** sorted list and leaves `items` as it was. Its `key` parameter takes a function: `sorted` calls it once per item and sorts by what it returns. The sort is **stable**: items with equal keys keep their original order.

```py
words = ["pear", "fig", "apple"]
sorted(words)              # ['apple', 'fig', 'pear']: alphabetical
sorted(words, key=len)     # ['fig', 'pear', 'apple']: by length
```

**`lambda`** writes a small function without a name, made of a single expression: `lambda score: -score` takes a number and returns it with the opposite sign. It is handy for a `key`: `sorted([7, 9, 4], key=lambda score: -score)` gives `[9, 7, 4]`, largest first. When the function needs more than one expression, use `def`.

**Returning a function.** A function can build another function and return it. The inner function **remembers** the values around it when it was created, so each call of the outer function gives a different one:

```py
def make_greeter(greeting):
    def greet(name):
        return f"{greeting}, {name}"
    return greet           # the function itself, not a call

hello = make_greeter("hello")
hello("ana")               # 'hello, ana'
```

Module 03 explains exactly what an inner function remembers (closures).

**Any number of arguments.** A parameter written `*amounts` collects every extra positional argument into a tuple; parameters after it can only be passed by keyword. `**options` collects extra keyword arguments into a dict (lesson 07). Module 03 covers the full rules:

```py
def total(*amounts, currency="EUR"):
    return f"{sum(amounts)} {currency}"

total(1, 2, 3)              # '6 EUR'
total(5, currency="USD")    # '5 USD'
```

**Recursion.** A function may call itself on a smaller part of the problem. It needs a **base case** that answers without calling itself, or the calls never stop and Python raises `RecursionError` after about 1,000 levels:

```py
def count_items(value):
    if not isinstance(value, list):
        return 1                    # base case: a single item
    total = 0
    for item in value:
        total += count_items(item)  # smaller problem
    return total

count_items([1, [2, 3], [[4]]])     # 4
```

**Imports.** Code in other files, called **modules**, is reached with `import`. `import math` gives you `math.sqrt(16)`; `from math import sqrt` gives you `sqrt` directly. Python ships a large **standard library** of such modules; module 07 tours it.

**Reading type hints.** Many functions you read, including this challenge's starter, carry **annotations** that document the expected types. They follow a parameter after `:` and the return value after `->`. Python stores them but never checks them when the function runs:

| You read | It means |
| --- | --- |
| `words: list[str]` | a list of texts |
| `-> int` | the function returns an `int` |
| `*amounts: int` | every extra argument is an `int` |
| `Callable[[int], int]` | a function that takes an `int` and returns an `int` |
| `object` | any value |

`Callable` comes from the standard library: `from collections.abc import Callable`.

## Common mistakes

**Calling a function when you mean to pass it.** `key=len()` calls `len` with no argument at once, before `sorted` even starts, and fails with `TypeError: len() takes exactly one argument (0 given)`. `sorted` needs the function itself:

```py
sorted(words, key=len())   # wrong: calls len right now
sorted(words, key=len)     # right: sorted calls len for each word
```

The same goes for returning a function: `return greet` hands back the function, while `return greet(name)` hands back one result.

**Forgetting the base case.** A recursive function without one calls itself until `RecursionError` stops it.

## When to choose it

- Pass a function (`key=len`, a `lambda`) when another function needs to know *how* to do one step, such as how to compare items.
- Return a function when you need several similar functions that differ in one value, such as a multiplier for each tax rate.
- Use `*args` when callers pass a varying number of values of the same kind.
- Use recursion for data nested inside itself, such as lists of lists; use a loop for flat data.
