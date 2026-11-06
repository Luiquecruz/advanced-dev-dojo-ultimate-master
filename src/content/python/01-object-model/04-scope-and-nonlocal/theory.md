Python decides where a name lives **by reading the function body**, before it runs. Lookup follows the **LEGB** order:

1. **L**ocal: names assigned inside the current function.
2. **E**nclosing: names of outer functions (closures).
3. **G**lobal: names assigned at module level.
4. **B**uilt-in: `len`, `print`, `range`...

```py
rate = 0.2                      # global

def price(amount):
    tax = amount * rate         # `rate` is found in the global scope
    return amount + tax
```

## How it works

If a function **assigns** to a name anywhere in its body, that name is local to the *whole* function, including the lines before the assignment. Python makes that decision when it compiles the function, not line by line while it runs.

```py
total = 0

def add(amount):
    total += amount             # UnboundLocalError: `total` is local here and has no value yet
```

Reading an outer name needs nothing. **Rebinding** it needs a declaration:

```py
def make_counter():
    count = 0

    def increment():
        nonlocal count          # rebind the enclosing variable
        count += 1
        return count

    return increment
```

An inner function that uses a variable of its enclosing function is a **closure**: it keeps that variable alive after the outer function has returned, and each call to `make_counter` creates a fresh `count`. `nonlocal` targets an enclosing function's variable; `global` targets a module-level one. Mutating an object (`values.append(1)`) needs neither, because it does not rebind the name.

Only some statements create a scope:

- Functions, classes, comprehensions and modules have their own scope.
- `if`, `for` and `while` do **not**: a name assigned inside them is visible after the block.
- A comprehension's loop variable stays inside it: `[i for i in range(3)]` does not leave `i` behind.
- A class body is not an enclosing scope for its methods: methods cannot see class attributes as bare names, they use `self.name`.

## Common mistakes

**Assigning to an enclosing variable without `nonlocal`.** Python treats the name as a new local of the inner function. In a function that reads the name first, that raises `UnboundLocalError`; in a function that only assigns, it fails silently: the assignment fills a local that disappears when the call ends, and the closure's variable never changes.

```py
def make_timer():
    elapsed = 0

    def reset():
        elapsed = 0             # wrong: a new local; the timer keeps its value

    def reset():
        nonlocal elapsed        # right: rebinds the enclosing variable
        elapsed = 0
```

**Reaching for `global`.** It hides dependencies and makes tests share state. Prefer parameters, return values or a closure.

**Shadowing built-ins.** `list = [...]` or `id = 5` compiles but breaks every later call to `list()` or `id()` in that scope.

## When to choose it

- A **closure with `nonlocal`** for small private state behind a function (counters, memoization, callbacks).
- A **class** when the state has several operations, needs inspection or must be shared safely.
- **Parameters and return values** whenever the state does not need to outlive the call.
- Avoid `global` except for true module constants.
