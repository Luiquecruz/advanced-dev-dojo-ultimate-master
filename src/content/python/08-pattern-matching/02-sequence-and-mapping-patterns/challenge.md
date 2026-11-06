A game client receives typed commands and JSON events. Rewrite both decoders in `main.py` with `match` so the shape of the input is checked by the patterns, not by hand-written indexing. Both functions must decide with a `match` statement.

## `parse_command(tokens)`

`tokens` is a list or tuple of strings, usually from `line.split()`. Return:

| Tokens | Result |
| --- | --- |
| `["move", x, y]` | `{"action": "move", "x": int(x), "y": int(y)}` |
| `["say", *words]` | `{"action": "say", "text": " ".join(words)}` (no words gives `""`) |
| `["quit"]` | `{"action": "quit"}` |

Anything else raises `ValueError`: an unknown first word, the wrong number of tokens (`["quit", "now"]`, `["move", "1"]`), an empty list, a plain string such as `"quit"`, or a dict.

The starter matches only `tokens[0]` and indexes the rest by hand. It accepts extra tokens and raises `IndexError` or `KeyError` instead of `ValueError`.

## `handle_event(event)`

`event` is a dict decoded from JSON. Return a tuple:

| Event | Result |
| --- | --- |
| `{"type": "click", "pos": (x, y)}` | `("click", x, y)`; `pos` may be a list or a tuple of two items |
| `{"type": "key", "key": key}` | `("key", key)` |
| `{"type": "resize", "size": {"width": w, "height": h}}` | `("resize", w, h)` |

Extra keys, at the top level or inside `size`, are ignored. Anything else raises `ValueError`: a missing key (a `key` event without `"key"` included), a `pos` with three items or given as a string such as `"xy"`, a `size` that is not a mapping or lacks `height`, an unknown `type`, or a value that is not a mapping at all.
