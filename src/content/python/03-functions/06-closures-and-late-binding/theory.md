A **closure** is a function that uses variables from the scope where it was defined. It does not copy their values: it keeps a reference to the **variable** itself, and reads it each time it runs.

```py
def make_counter():
    count = 0

    def increment():
        nonlocal count
        count += 1
        return count

    return increment

counter = make_counter()
counter(); print(counter())   # 2: `count` lives on after make_counter returned
```

## Coming from TypeScript and JavaScript

In modern JavaScript, `let` in a `for` loop creates a **new binding per iteration**, so callbacks built in a loop each see their own value. Only the old `var` shared one variable:

```ts
const handlers = [];
for (const name of ["ada", "linus"]) {
  handlers.push(() => `hello ${name}`);
}
handlers.map((handler) => handler());   // ["hello ada", "hello linus"]
```

Python loops and comprehensions behave like `var`. The loop variable is **one** variable of the enclosing scope, rebound on each iteration. Every lambda closes over that same variable and reads it when called, after the loop has finished:

```py
handlers = [lambda: f"hello {name}" for name in ["ada", "linus"]]
[handler() for handler in handlers]   # ['hello linus', 'hello linus']
```

This is **late binding**: names in a closure are looked up at call time, not at definition time.

## How it works

Variables that an inner function uses are stored in **cells**. The inner function's `__closure__` holds references to those cells, so it sees every later rebinding:

```py
print(handlers[0].__closure__[0].cell_contents)   # 'linus'
```

Three ways to bind the **current** value instead:

```py
def make_greeter(name):                 # 1. a factory: each call creates a new scope
    return lambda: f"hello {name}"

lambda name=name: f"hello {name}"       # 2. a default argument, evaluated at definition time

from functools import partial
partial(greet, name)                    # 3. partial stores the argument on the object
```

The factory is the clearest. The default-argument trick works but leaks an optional parameter that callers can override.

### State in closures

`nonlocal` lets an inner function rebind a variable of the enclosing function, which makes closures a small, private place for state: a cache, a counter, a "has it run yet" flag. Each call of the outer function creates fresh cells, so two wrappers never share state.

Pitfalls:

- Using the result as the "already ran" flag (`if result is None`) breaks when the function legitimately returns `None`. Keep a separate boolean.
- If the first call raises, assign the flag only **after** the call succeeds, or the wrapper will return a value that was never computed.
- Closing over a mutable object (a list) and mutating it needs no `nonlocal`; rebinding the name does.

## When to choose it

- **A closure** for small private state attached to one function: memoizing, counting, configuring a callback.
- **A factory function** whenever you build callables in a loop.
- **`functools.partial`** to pre-fill arguments of an existing function without writing a wrapper.
- **A class** when the state grows several fields, needs methods to inspect or reset it, or must be visible in a debugger: closures hide their state on purpose.
