Every function call that is running has a **frame**: the object that holds its local variables, the code it executes (`f_code`), its current line (`f_lineno`) and a link to the frame that called it (`f_back`). When an exception propagates, Python records the frames it unwinds in a **traceback**, a linked list of frame and line entries. `logging`, `warnings.warn(stacklevel=2)`, test runners and error trackers are built on these two structures.

```py
import sys
import traceback

def audit():
    caller = sys._getframe(1)               # the frame that called audit()
    return caller.f_code.co_name

def checkout():
    return audit()

checkout()                                  # 'checkout'

def parse(text):
    return int(text)

try:
    parse("12a")
except ValueError as error:
    [entry.name for entry in traceback.extract_tb(error.__traceback__)]   # ['<module>', 'parse']
```

## How it works

**Frames.** `inspect.currentframe()` returns the current frame and `sys._getframe(depth)` jumps `depth` calls up, raising `ValueError` past the bottom of the stack. Both are CPython implementation details: `inspect.currentframe()` returns `None` on interpreters without frame support, which is why libraries guard for it. `f_code.co_name` is the function name; `co_qualname` adds the class, as in `Cart.total`.

**Tracebacks.** As an exception unwinds, each level inserts an entry **in front** of the traceback. `error.__traceback__` therefore starts at the frame that caught the exception, and `tb_next` walks toward the frame that raised it. `traceback.extract_tb(tb)` and `traceback.extract_stack(frame)` turn either structure into a `StackSummary` of `FrameSummary` objects (`name`, `filename`, `lineno`, `line`), oldest call first, the order a traceback prints.

**Exception links.** Python links errors automatically. An exception raised inside an `except` block stores the one being handled in `__context__` ("During handling of the above exception, another exception occurred"). `raise ... from cause` sets `__cause__` ("The above exception was the direct cause") and `raise ... from None` sets `__suppress_context__` to hide the context. A printed traceback follows `__cause__` when it is set, otherwise `__context__` unless it is suppressed.

**`TracebackException`** captures an exception, its stack and its whole chain (`__cause__`, `__context__`, `__suppress_context__`, and `exceptions` for groups) without keeping frames alive, and stops at an exception it has already seen, so a chain that loops never hangs it. `exc_type_str` is the type as a traceback prints it: `KeyError` for builtins, `billing.ChargeError` otherwise. Logging handlers and error trackers store it and call `format()` later.

**Reference cycles.** A frame references its locals. Storing that frame, or a traceback (which references frames), in one of those locals creates a cycle: frame, locals, frame. Everything the frame can reach then lives until the cycle collector runs. This is why Python deletes the name bound by `except ... as error` at the end of the block, why the `inspect` docs put `del frame` in a `finally`, and why `traceback.clear_frames(tb)` and `frame.clear()` exist for code that must keep a traceback. Prefer storing a `TracebackException`, or just the names you need.

**Locals leak secrets.** `frame.f_locals` exposes every local variable, passwords and tokens included. `TracebackException(capture_locals=False)` is the default for that reason. Snapshot locals with `dict(frame.f_locals)` only for a debugger, never log them, and keep tracebacks out of error pages shown to users.

> **Status as of November 2026:** this track runs CPython 3.14 in Pyodide, where `sys._getframe`, `inspect.currentframe` and `traceback` behave as in CPython. Since 3.13 (PEP 667) `frame.f_locals` of a function is a write-through proxy and `locals()` returns an independent snapshot. Python 3.13 added `TracebackException.exc_type_str` and deprecated `exc_type`. Python 3.14 added `frame.f_generator`, and `traceback.walk_stack` now captures the stack when it is called instead of when it is first iterated.

## Common mistakes

**Walking only `__cause__`.** Most real chains are implicit: an error raised while handling another one is linked through `__context__`, and only `raise ... from` sets `__cause__`. A walker that follows `__cause__` alone loses the root cause, and one that ignores `__suppress_context__` shows links the author hid on purpose:

```py
# wrong: stops at the first implicit link
while error is not None:
    names.append(type(error).__name__)
    error = error.__cause__

# right: the rule a traceback prints with, guarded against loops
seen = set()
while error is not None and id(error) not in seen:
    seen.add(id(error))
    names.append(type(error).__name__)
    if error.__cause__ is not None:
        error = error.__cause__
    elif error.__suppress_context__:
        error = None
    else:
        error = error.__context__
```

The same goes for stacks: read names from frames and `FrameSummary` objects instead of parsing `traceback.format_stack()` text, whose format changes between versions and breaks on names such as `<lambda>`.

## When to choose it

- **Caller names** for logging, warnings and deprecation helpers (`stacklevel` is the same idea), never for control flow: behavior that depends on who called you breaks under decorators, wrappers and refactors.
- **`TracebackException` and `extract_tb`** to store, compare and render errors later: error trackers, retry reports, test runners.
- **Avoid** logging `f_locals`, parsing formatted stacks and keeping frames or tracebacks in long-lived objects. When a function needs context, such as a request id, pass it explicitly or through `logging`'s `extra` rather than discovering it from the stack.
