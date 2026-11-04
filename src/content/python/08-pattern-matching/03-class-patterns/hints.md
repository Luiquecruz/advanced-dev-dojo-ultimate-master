A type check in a pattern needs parentheses: `case Square(side):` or `case Square():`. A bare `case Square:` is a capture pattern that matches anything and binds it to a local variable named `Square`.
---
Dataclasses already have `__match_args__` in field order, so `Square(side)` binds the side by position. A plain class needs its own class attribute: `__match_args__ = ("x", "y")` lists the attributes that positions 1 and 2 stand for, and nothing else.
---
Mix positional and keyword sub-patterns, positional first: `case Click(x, y, button="left"):` for the default button, then `case Click(x, y, button=button):` for the others. End each `match` with `case _:` that raises `TypeError(f"... {type(value).__name__}")`.
