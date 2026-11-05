A reporting job builds object-store keys, writes CSV exports into a directory, streams uploads between buffers and serves files whose names come from a URL. Write five functions in `main.py`. Tests run in a fresh temporary directory; never use relative paths.

## `build_path(*parts)`

Return a `pathlib.PurePosixPath` (not a `Path`) joining every part: object-store keys and URLs use `/` on every operating system and never touch the file system. Joining follows `pathlib` rules, so an absolute part restarts the path.

## `write_report(directory, rows)` and `read_report(path)`

`directory` is a `Path` that may not exist yet: create it, including missing parents. Write `rows` (a list of lists of `str`, the first row being the header) as CSV to `directory / "report.csv"` with the `csv` module, `encoding="utf-8"` and `newline=""`, and return that `Path`. Cells may contain commas, double quotes, line breaks and non-ASCII letters.

`read_report(path)` returns the rows of such a file as a list of lists of `str`, equal to what was written.

## `copy_stream(source, target, chunk_size)`

Copy every byte from the binary file object `source` to `target`, calling `source.read(chunk_size)` until it returns `b""`, so that no read asks for more than `chunk_size` bytes. Return the number of bytes copied. Raise `ValueError` when `chunk_size` is less than `1`.

## `safe_join(base, name)`

`name` comes from a request. Return the fully resolved path of `name` inside the directory `base`: `safe_join(base, "reports/../q4.csv")` is `base.resolve() / "q4.csv"`. Raise `ValueError` when the resolved path is not inside `base.resolve()`: `"../x"`, an absolute name such as `"/etc/passwd"`, `"a/../../x"`, a sibling directory whose name starts with the same letters (`"../data-evil/x"` next to `data`), and a symbolic link inside `base` that points outside it.
