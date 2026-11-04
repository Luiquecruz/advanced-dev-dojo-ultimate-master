1. Name the two roles before writing code: the object that owns the data and the object that owns the position. Decide which role `Paginator` and `LineReader` play.
2. Write the `Paginator`'s cursor first: track the page and the item inside it, skip empty pages, and raise `StopIteration` only after the last page.
3. Make `Paginator.__iter__` create a new cursor on every call, then trace two nested loops over one paginator and count the pairs you expect.
4. Turn `LineReader` into its own iterator: strip the newline, count each line as it is handed out, and check what a second `next()` after the end does.
5. Write the helpers from `iter(obj)` and the identity of its result, handle objects that are not iterable, and check every row of the table in the challenge.
6. Run the demo and compare the second pass over the paginator with the second pass over the reader.
