A config loader splits text into blocks, a batch job needs only the first few records of a long stream, and an invoicing service hands out ids. Write all three in `main.py` as **generator functions** (with `yield`): the tests check `inspect.isgenerator` on what each one returns. The starter builds and returns lists, so each function reads its whole source before the caller gets anything.

## `read_blocks(lines)`

`lines` is any iterable of strings. A line is blank when `line.strip() == ""`.

- Yield each block, a `list` of consecutive non-blank lines (unchanged), as soon as a blank line closes it.
- Blank lines at the start, at the end or several in a row produce no empty blocks.
- The last block is yielded even when no blank line follows it.
- Calling `read_blocks` reads nothing. Getting the first block reads the source up to and including the blank line that closes it, and no further.

## `take(count, iterable)`

- Yield the first `count` items of `iterable`, or fewer when it is shorter.
- Never pull more than `count` items from the source: two `take(2, numbers)` calls on the same iterator return consecutive items (`[0, 1]`, then `[2, 3]`).
- `count <= 0` yields nothing and reads nothing.

## `id_sequence(prefix)`

- Yield `f"{prefix}-1"`, `f"{prefix}-2"`, ... without end.
- Every call starts its own sequence at `1`: `id_sequence("inv")` begins at `"inv-1"` however far another sequence has gone.
