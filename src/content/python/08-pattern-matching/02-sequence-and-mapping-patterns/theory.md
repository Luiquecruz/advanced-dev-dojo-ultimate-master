A `match` statement evaluates its **subject** once and tries each `case` from top to bottom. The first pattern that fits runs its block, with the names in the pattern bound to the parts it matched; then execution continues after the whole `match`, and no other block runs.

```py
def parse(tokens):
    match tokens:
        case ["move", x, y]:            # a sequence of exactly 3 items, the first equal to "move"
            return ("move", int(x), int(y))
        case ["say", *words]:           # "say" followed by zero or more items
            return ("say", " ".join(words))
        case ["quit"]:
            return ("quit",)
        case _:                         # wildcard: anything else
            raise ValueError(f"unknown command: {tokens!r}")

parse("move 3 4".split())   # ('move', 3, 4)
parse(["quit", "now"])      # ValueError: the length is part of the pattern
```

Mapping patterns check keys instead of positions, and patterns nest:

```py
match event:
    case {"type": "click", "pos": (x, y)}:
        print("click", x, y)
    case {"type": "resize", "size": {"width": width, "height": height}}:
        print("resize", width, height)
```

## How it works

**Sequence patterns.** `[a, b]` and `(a, b)` mean the same thing. They match any `collections.abc.Sequence` (lists, tuples, `range`, `deque`) but **never `str`, `bytes` or `bytearray`**, so a string is not split into characters. Iterators and generators are not sequences and never match. Without a star the length must be exact. One starred name per pattern, in any position, collects the rest into a **list** that may be empty; `*_` accepts any rest without binding it. Careful with parentheses: `(x,)` is a one-item sequence, `(x)` is just `x`.

**Mapping patterns.** They match any `collections.abc.Mapping`. Every key written in the pattern must be present and its value must match the sub-pattern. **Extra keys are ignored**, which suits JSON payloads that gain new fields. `**rest` binds the remaining items as a new dict; `**_` is a `SyntaxError`, because ignoring extra keys is already the default. Keys must be literals or dotted names, never capture names. Values are read with the mapping's two-argument `get()`, so matching a `defaultdict` never creates the keys it looks for.

**Literals.** Strings and numbers compare with `==`. `None`, `True` and `False` compare with `is`, so `case True:` does not match `1`.

Pitfalls:

- `case {}:` matches **every** mapping and `case [*_]:` every sequence. Put general cases after specific ones.
- A bare name never compares: `case [command, x]:` binds `command` to whatever comes first. Literal words need quotes.
- Capturing a whole value and unpacking it in the block (`case {"pos": pos}:` then `x, y = pos`) gives up the shape check: a string `"xy"` unpacks into two characters. Put the shape in the pattern (`"pos": (x, y)`), which never matches a `str`.
- Names bound by a pattern that failed halfway may or may not be set. Use the names only in the block whose pattern matched.

## Common mistakes

**Matching only the first token and indexing the rest.** With `tokens[0]` as the subject, the pattern never sees the length: extra tokens are accepted, missing ones raise `IndexError` (or `KeyError` for a dict), and the shape check lives nowhere:

```py
# wrong: ["quit", "now"] is accepted, ["move", "1"] raises IndexError
match tokens[0]:
    case "move":
        return {"action": "move", "x": int(tokens[1]), "y": int(tokens[2])}
    case "quit":
        return {"action": "quit"}

# right: the whole value is the subject, so the length is part of each pattern
match tokens:
    case ["move", x, y]:
        return {"action": "move", "x": int(x), "y": int(y)}
    case ["quit"]:
        return {"action": "quit"}
    case _:
        raise ValueError(f"unknown command: {tokens!r}")
```

A pattern that does not fit simply moves on to the next `case`, so wrong shapes reach the final `case _:` and fail with your own error.

## When to choose it

- **`match`** when the branch depends on the shape of the data: token lists, tuples from a parser, JSON-like dicts with a type tag. One pattern documents the shape and checks it.
- **`if`/`elif`** for ranges, flags and comparisons with other variables (`if size > limit`). A pattern cannot say `>` on its own; guards (lesson 04) add that.
- **A dict of handlers** (`HANDLERS[event["type"]](event)`) when other modules register new event types. A `match` must be edited for every new case.
- Always end with a `case _:` that raises, so an unexpected shape fails loudly instead of returning `None`.
