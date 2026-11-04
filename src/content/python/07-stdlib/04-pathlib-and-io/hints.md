`PurePosixPath(*parts)` builds the key in one call. For the report, `directory.mkdir(parents=True, exist_ok=True)`, then `path.open("w", encoding="utf-8", newline="")` and `csv.writer(file).writerows(rows)`; read it back with `csv.reader` on a file opened the same way.
---
`copy_stream` is a loop: `chunk = source.read(chunk_size)`, stop when `chunk` is empty, otherwise write it and add `len(chunk)`. Check `chunk_size` before the loop: `read(0)` returns `b""` at once and `read(-1)` reads everything.
---
In `safe_join`, resolve `base` once, resolve `root / name`, and compare with `is_relative_to(root)`. Comparing strings with `startswith` accepts `data-evil`, and skipping `resolve()` lets `..` and symbolic links through.
