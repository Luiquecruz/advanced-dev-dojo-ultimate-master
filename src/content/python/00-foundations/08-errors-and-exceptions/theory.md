When Python cannot carry out an operation, it **raises an exception**: it stops at that line, abandons every function call in progress, and prints a **traceback**, unless some code handles the exception.

```py
def average(numbers):
    return sum(numbers) / len(numbers)

average([])
```

```text
Traceback (most recent call last):
  File "main.py", line 4, in <module>
    average([])
    ~~~~~~~^^^^
  File "main.py", line 2, in average
    return sum(numbers) / len(numbers)
           ~~~~~~~~~~~~~^~~~~~~~~~~~~~
ZeroDivisionError: division by zero
```

Read a traceback from the bottom. The last line names the exception type and its message. The lines above it are the chain of calls that led there, the most recent call last, with markers under the part of the line that failed.

## How it works

**Built-in exceptions.** Each kind of failure is a class with a name that says what went wrong:

| Exception | Raised when | Example |
| --- | --- | --- |
| `ValueError` | the type is right but the value is not | `int("12abc")` |
| `TypeError` | the type does not fit the operation | `"3" + 4` |
| `KeyError` | a dict has no such key | `{}["port"]` |
| `IndexError` | a list or string has no such position | `[1, 2][5]` |
| `ZeroDivisionError` | dividing by zero | `1 / 0` |
| `AttributeError` | an object has no such attribute or method | `None.upper()` |

**Raising.** `raise ValueError("message")` stops the function and sends the exception to its caller. Raise when a function receives something it cannot work with, and put the bad value in the message so the reader knows what to fix:

```py
def parse_age(text):
    age = int(text)               # int itself raises ValueError for "abc"
    if age < 0:
        raise ValueError(f"age cannot be negative: {age}")
    return age
```

**Handling.** `try` runs a block. When an exception is raised inside it, Python checks the `except` clauses from top to bottom and runs the first one whose type matches. `as error` names the exception object, and `str(error)` is its message. A tuple handles several types the same way:

```py
def read_timeout(settings):
    try:
        value = int(settings["timeout"])
    except KeyError:
        return 30                                  # missing: use a default
    except (ValueError, TypeError) as error:
        raise ValueError(f"bad timeout: {settings['timeout']!r}") from error
    else:
        return value                               # runs only when try raised nothing
    finally:
        print("timeout checked")                   # runs in every case
```

`else` keeps the code that should run only after a success outside the `try`, so its own errors are not caught by mistake. `finally` holds clean-up that must happen whether the block succeeded, raised or returned: closing a file, writing a log line. An exception that no clause handles still runs `finally` and then continues to the caller.

`raise NewError(...) from error` replaces a low-level error with one that makes sense to the caller, and the traceback shows both, the original marked as the direct cause.

**Re-raising.** Inside an `except` block, a bare `raise` sends the same exception on after you have done something with it, such as counting it:

```py
failures = 0
try:
    total = int(text)
except ValueError:
    failures += 1
    raise
```

## Common mistakes

**Catching every exception.** `except Exception:` (or a bare `except:`) also catches the errors you did not plan for, including bugs, and turns them into a quiet wrong answer:

```py
def safe_ratio(part, whole):
    try:
        return part / whole
    except Exception:              # wrong: safe_ratio("3", 4) also returns None
        return None

def safe_ratio(part, whole):
    try:
        return part / whole
    except ZeroDivisionError:      # right: only the case you planned for
        return None
```

With the fix, `safe_ratio("3", 4)` raises `TypeError` and the traceback points at the caller that passed text.

**Putting the whole function inside `try`.** The more lines a `try` covers, the more unrelated errors its `except` swallows. Wrap only the line that can fail, and move the rest to `else` or after the block.

## When to choose it

- `raise` with the closest built-in type (`ValueError`, `TypeError`) and a message that names the bad value, when a function cannot do its job.
- `try` with a specific `except` when you know what to do next: use a default, skip one item, report it and continue.
- `finally` for clean-up that must run either way.
- No `try` at all when this function cannot do anything useful about the failure: let the exception travel up, because a traceback is easier to fix than a wrong result.
- An `if` check instead of `try` when the case is ordinary and cheap to test, such as `if "port" in settings`.
