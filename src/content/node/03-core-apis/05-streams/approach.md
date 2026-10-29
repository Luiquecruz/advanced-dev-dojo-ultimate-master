1. Accept that chunk boundaries are arbitrary: a chunk can end in the middle of a line, so splitting each chunk alone is wrong.
2. Carry the incomplete last piece of every chunk into the next one; only the pieces before it are finished lines.
3. When the stream ends, whatever is left is the last line, unless it is empty (the file ended with `\n`).
4. Write it as an `async function*` so callers consume lines with `for await`, exactly like the chunks themselves.
5. In `summarizeLog`, pass `encoding: 'utf8'` so the stream decodes multi-byte characters safely, and keep a tiny `highWaterMark` to prove the logic works across many chunks.
6. Let stream errors propagate: `for await` rethrows them, so the promise rejects with the original `ENOENT`.
