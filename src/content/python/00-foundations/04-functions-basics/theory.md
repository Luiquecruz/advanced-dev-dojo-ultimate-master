A **function** gives a name to a piece of work so you can run it whenever you need it. `def` creates the function, the names in parentheses are its **parameters**, and `return` hands the result back to the code that **called** it:

```py
def line_total(price_cents, quantity):
    """Return the price of one receipt line in cents."""
    return price_cents * quantity

total = line_total(1250, 3)   # the call: 1250 and 3 are the arguments
print(total)                  # 3750
```

The indented lines are the function's **body**. Nothing in the body runs when `def` runs; it runs each time the function is called.

## How it works

**Calling binds arguments to parameters.** In `line_total(1250, 3)`, Python attaches `price_cents` to `1250` and `quantity` to `3`, then runs the body. These are **positional arguments**: matched by order.

**`return` ends the function.** As soon as Python reaches `return`, the function stops and its value becomes the value of the call. A function that ends without `return`, or with a bare `return`, gives back **`None`**:

```py
def greet(name):
    print(f"hello {name}")

result = greet("ana")   # prints hello ana
print(result)           # None
```

**Default values.** A parameter can have a default, used when the caller leaves it out. Parameters with defaults come after the ones without:

```py
def apply_discount(price_cents, percent=10):
    return price_cents - price_cents * percent // 100

apply_discount(2000)              # 1800, percent is 10
apply_discount(2000, 25)          # 1500
apply_discount(999)               # 900, the discount 99.9 is rounded down to 99
```

**Keyword arguments.** A caller can name the parameter: `apply_discount(2000, percent=25)`. Named arguments make calls readable and can come in any order after the positional ones. Module 03 shows how a function can require them.

**Returning several values.** `return low, high` returns a **tuple**, a fixed group of values. The caller takes it apart with **unpacking**, one name per value; `_` is the usual name for a value you do not need:

```py
def low_and_high(numbers):
    return min(numbers), max(numbers)

low, high = low_and_high([4, 9, 2])   # low is 2, high is 9
low, _ = low_and_high([4, 9, 2])
```

`min`, `max`, `sum` and `len` are **built-in functions**: always available, no `def` needed. `min([])` raises a `ValueError`, so check for an empty list first.

**Local variables.** Names created inside a function exist only while it runs and are invisible outside it. Two functions can each have a variable called `total` without any clash. A function should receive what it needs through parameters and hand back what it produces through `return`.

**Docstrings.** A string on the first line of the body describes the function. Tools and `help(line_total)` show it. Keep it to one short sentence that says what the function returns.

**Functions calling functions.** A function can call another one and use its result, which is how larger programs are built from small, tested pieces.

## Common mistakes

**Printing the result instead of returning it.** The screen shows the right numbers, so the function looks finished, but the caller receives `None` and every calculation built on it breaks:

```py
def stats(numbers):
    print(min(numbers), max(numbers))     # wrong: the call gives back None

def stats(numbers):
    return min(numbers), max(numbers)     # right: the caller gets the values
```

Use `print` in the code that shows results (such as `demo.py`) and `return` in the functions that compute them.

**Calling before the function exists.** Python runs a file from top to bottom, so a call placed above its `def` raises `NameError`. Define functions first, call them afterwards.

## When to choose it

- Write a function as soon as you would copy the same lines twice, or when a piece of work deserves a name.
- Give a parameter a default when most callers use the same value; let callers name it with a keyword argument when the number alone would be unclear.
- Return a tuple for two or three values that belong together; for more, lesson 07's dicts and lesson 09's classes read better.
- Keep functions free of `print` unless showing text is their job.
