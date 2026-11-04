Match the whole argument, not its first item: `match tokens:` and `match event:`. A pattern such as `["quit"]` only fits a sequence of exactly one item equal to `"quit"`, so wrong lengths fall through to the next `case` on their own.
---
A starred name takes the rest of a sequence as a list, even when nothing is left: `["say", *words]` fits `["say"]` with `words == []`. Literal words go in quotes; a bare name such as `x` captures whatever is in that position.
---
Mapping patterns only require the keys you write and ignore the others, and their values can be patterns too: `{"type": "click", "pos": (x, y)}` checks that `pos` is a two-item sequence, and `{"size": {"width": width, "height": height}}` nests a mapping. Finish each `match` with `case _:` that raises `ValueError`.
