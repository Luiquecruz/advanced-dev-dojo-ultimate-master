1. Separate pure paths (keys, no file system) from concrete paths (files on disk) and decide which class each function returns.
2. Predict `PurePosixPath("reports") / "/etc/passwd"` before running it; that rule is the root of the traversal problem in `safe_join`.
3. Write the CSV functions with the `csv` module and a file opened with an explicit encoding and `newline=""`, then round-trip a cell holding a comma, a quote and a line break.
4. Write `copy_stream` as a loop around `read(chunk_size)` and count bytes as you go; run it on a 10-byte source with chunks of 4 and on an empty source.
5. For `safe_join`, list the escapes (`..`, absolute names, a sibling with the same prefix, a link) and check that one resolve-then-compare rule rejects all of them while `reports/../q4.csv` still works.
