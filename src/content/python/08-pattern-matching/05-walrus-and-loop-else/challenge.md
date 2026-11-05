Repair three helpers of a file-upload and config service in `main.py`. Each starter carries a common mistake; the tests also check that `read_chunks` and `parse_pairs` use `:=` and that `find_first` uses `for … else`.

## `read_chunks(read, size)`

`read` is a callable such as `stream.read`: it returns up to `size` bytes (or characters) and an empty `b""` or `""` once the data is exhausted. Call `read(size)` until it returns an empty value and return the list of non-empty chunks.

- `read` is called exactly once more than the number of chunks (the final empty read) and never again after it.
- No data gives `[]`. Works for bytes and text streams.

The starter uses a `while True` loop that appends before checking, so the empty end marker ends up in the list.

## `find_first(items, predicate)`

Return `(index, item)` for the first item for which `predicate(item)` is truthy, or `None` when no item matches (including when `items` is empty).

- `predicate` is not called for items after the first match.
- `items` may be any iterable, a generator included, and a falsy item such as `0` can be the match.

The starter's `else` belongs to the `if`, so it gives up after the first item.

## `parse_pairs(lines, parse=parse_line)`

`parse_line(line)` is already written: it returns a stripped `(key, value)` pair for `"key = value"` and `None` for blank lines, `#` comments, lines without `=` and lines with an empty key.

Return a dict built from the pairs of the lines that parse (later keys win), calling `parse` **exactly once per line**, in order. `lines` may be any iterable of strings, a generator included.

The starter filters with `parse(line)` and then calls it again for the value, so every kept line is parsed twice.
