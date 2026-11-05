Python has three small control-flow tools that make loops and error handling shorter and safer, plus a one-line conditional expression.

The **assignment expression** `name := value` (PEP 572, Python 3.8, nicknamed the walrus operator) assigns and returns a value inside an expression:

```py
import io

stream = io.BytesIO(b"abcdefg")
while chunk := stream.read(3):      # b"abc", b"def", b"g"; then b"" ends the loop
    print(chunk)
```

**`for … else`** runs the `else` block only when the loop finished without `break`:

```py
for index, port in enumerate([80, 443, 8080]):
    if port > 1024:
        break                        # found: skip the else, index and port keep their values
else:
    index = port = None              # no break: nothing matched
```

**`try … else`** runs the `else` block only when the `try` block raised nothing:

```py
try:
    value = int(text)
except ValueError:
    value = None
else:
    record(value)                    # a ValueError raised here is not mistaken for a parse error
```

**Conditional expressions** put the condition in the middle: `label = "even" if n % 2 == 0 else "odd"`.

## How it works

**Why `:=` exists.** `=` is a statement, not an expression, so `while chunk = read(3):` is a `SyntaxError`. `:=` assigns inside a condition or a comprehension, so one computed value can be tested and kept: `[parse(line) for line in lines if parse(line)]` calls `parse` twice for every kept line, while `[pair for line in lines if (pair := parse(line)) is not None]` calls it once.

**Walrus scope.** `:=` binds in the enclosing function or module, even inside a comprehension or generator expression: after `[y for x in data if (y := f(x))]`, `y` holds the last value bound. The target cannot also be the comprehension's `for` target, and a comprehension in a class body cannot use `:=` to bind a class attribute.

**Precedence.** `:=` binds looser than every other operator, comparisons and `or` included: `if n := len(items) > 10:` assigns the boolean. Write `if (n := len(items)) > 10:`. An unparenthesized `:=` is rejected as a whole statement (`y := 1`), at the top level of an assignment's right-hand side and as a keyword argument value; parentheses fix all three.

**Loop `else`.** It runs when a `for` loop runs out of items (an empty iterable included) or a `while` condition becomes false, and it is skipped when `break` leaves the loop or `return` leaves the function. `continue` does not affect it. After a `break` the loop variables keep their last values, so the item that matched is still in scope.

**`try` `else`.** It runs when control leaves the `try` block with no exception and no `return`, `break` or `continue`. Exceptions raised in it are not handled by the `except` clauses above it, which keeps the `try` block down to the one call that can fail. `finally` still runs last.

## Common mistakes

**Indenting the `else` under the `if` inside the loop.** That `else` belongs to the `if`, so it runs for every item that does not match, instead of once after the loop. The loop's `else` is written at the level of `for` and means "the loop was not left by `break`":

```py
# wrong: prints "no free port" once for every busy port before the free one
for port in ports:
    if is_free(port):
        print("using", port)
        break
    else:
        print("no free port")

# right: the loop's else runs once, and only when no break happened
for port in ports:
    if is_free(port):
        print("using", port)
        break
else:
    print("no free port")
```

Inside a search function, the misplaced `else` usually holds a `return None`, so the search gives up after the first item.

**Appending before the emptiness check in a `while True` read loop.** The empty chunk that marks the end lands in the result; `while chunk := read(size):` reads, tests and binds in one place.

## When to choose it

- **`while x := next_value():`** for read loops and polling, and **`:=` in a comprehension filter** when one computed value is both tested and kept. Avoid it in plain assignments and nested conditions, where a separate line reads better.
- **`for … else`** for "search, then handle not found" without a flag variable. If your team finds it confusing, a helper that returns from inside the loop and returns `None` after it is equally correct.
- **`try … else`** to keep the protected block to the statement that can raise the handled exception.
- **Conditional expressions** to choose between two values; an `if` statement for side effects or more than two branches.
