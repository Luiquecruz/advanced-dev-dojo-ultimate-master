Dispatch on the type of an object with class patterns in `main.py`. Both `area` and `describe` must use class patterns inside a `match` statement.

## Step 1: shapes

`Circle(radius)`, `Rectangle(width, height)` and `Square(side)` are frozen dataclasses (already written), so they have generated `__match_args__`.

### `area(shape)`

- `Circle` → `math.pi * radius ** 2`, `Rectangle` → `width * height`, `Square` → `side ** 2`.
- Instances of subclasses count as their base: a `class Tile(Square)` instance is a square.
- Anything else raises `TypeError` whose message contains the type name of the argument (`type(shape).__name__`, for example `"str"` or `"Triangle"`). Objects that merely have a `side` or `radius` attribute are not shapes.

The starter handles circles and rectangles and returns `0.0` for everything else.

## Step 2: events

### `class Click(x, y, button="left")`

A plain class (already written). Declare `__match_args__` so that `Click(a, b)` in a `case` matches `x` then `y` by position. `button` is matched by keyword only, so a pattern with three positional sub-patterns raises `TypeError`.

### `KeyPress(key, modifiers=())`

A frozen dataclass (already written); `modifiers` is a tuple such as `("ctrl", "shift")`.

### `describe(event)`

| Event | Result |
| --- | --- |
| `Click(10, 20)` | `"click at 10,20"` |
| `Click(1, 2, button="right")` | `"right click at 1,2"` (any button other than `"left"`) |
| `KeyPress("q")` | `"q"` |
| `KeyPress("s", ("ctrl", "shift"))` | `"ctrl+shift+s"` (modifiers in order, then the key) |

Anything else raises `TypeError` whose message contains the type name of the argument.
