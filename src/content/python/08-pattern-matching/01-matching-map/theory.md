**Question this module answers:** when does `match` express intent better than `if`/`elif`, a dict of handlers or polymorphism?

## Prerequisites

Module 02 (unpacking with `*`, dicts and sequences), module 04 (dataclasses) and module 07 (enums).

## Destructuring plus dispatch

```py
from dataclasses import dataclass

@dataclass
class Point:
    x: int
    y: int

def handle(message):
    match message:
        case ["move", x, y]:
            return f"move to {x},{y}"
        case {"type": "click", "pos": (x, y)}:
            return f"click at {x},{y}"
        case Point(x=0, y=0):
            return "origin"
        case _:
            raise ValueError(f"unknown message: {message!r}")
```

Each `case` checks a **shape** (type, length, keys, attributes) and **binds** names to its parts in one step. Cases are tried in order, and only the first that matches runs.

| Pattern | Example | Matches |
| --- | --- | --- |
| Literal | `"quit"`, `0`, `None` | an equal value (`is` for `None`, `True`, `False`) |
| Capture | `x` | anything, and binds it to `x` |
| Wildcard | `_` | anything, binds nothing |
| Value | `Color.RED` | a dotted name, compared with `==` |
| Sequence | `[x, *rest]` | a list, tuple or other sequence of that shape, never a `str` |
| Mapping | `{"type": t}` | a mapping with those keys; extra keys ignored |
| Class | `Point(x=0)` | `isinstance` plus attribute checks |

Or-patterns, `as` captures and `if` guards combine them.

## A bare name captures

A `case` pattern is not an expression that Python evaluates and compares. A plain name in a pattern is a capture, even when a variable of that name exists:

```py
QUIT = "quit"
match command:
    case QUIT:       # SyntaxError: name capture 'QUIT' makes remaining patterns unreachable
        ...
    case _:
        ...
```

A bare name is a **capture**: it matches anything and binds it. Compare with a literal (`"quit"`), a dotted name (`Command.QUIT`) or a guard (`case c if c == QUIT:`).

Structural pattern matching arrived in Python 3.10 (PEP 634 specification, PEP 635 motivation, PEP 636 tutorial). 3.14, the version this track runs, only improved the error message for an invalid target after `case ... as`; later versions can extend the pattern syntax (3.15 accepts a unary plus in a literal pattern), so read the What's New page of the version you run. `match` and `case` are soft keywords, so they remain valid variable names.

## The path

Sequence and mapping patterns (a command parser), class patterns and `__match_args__`, guards, or-patterns and captures (a request router), then the walrus operator and the `else` clauses of loops and `try`, then an ADR.

## When to choose it

The closing ADR sizes this choice with numbers. It trains: `match` when the branch depends on the shape of data (JSON-like dicts with a type tag, token lists, a closed set of dataclasses); `if`/`elif` for ranges and plain conditions; a dict of handlers when other code registers new cases; a method on each class when every new type should bring its own behavior.
