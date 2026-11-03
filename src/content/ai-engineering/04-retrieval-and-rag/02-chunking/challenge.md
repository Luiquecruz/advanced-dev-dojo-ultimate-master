Write the three chunkers of an ingestion pipeline for the Brightdesk handbook: fixed windows, recursive splitting and Markdown-aware splitting. Every chunk keeps exact offsets and metadata so it can be cited and re-indexed later.

A document is `{ source, text }`. Every chunker returns a list of chunks:

```ts
{ id, source, text, start, end, headingPath }
```

- `text` is exactly `document.text.slice(start, end)`.
- `id` is `` `${source}#${index}` ``, where `index` counts the chunks returned, from 0.
- `headingPath` is a list of heading titles (empty for `chunkFixed` and `chunkRecursive`).

All sizes are in characters. Every chunker takes `options = { size, overlap }` and throws a `RangeError` when `overlap` is negative or not smaller than `size`.

## 1. `chunkFixed(document, options)`

Windows of `size` characters, the first starting at 0 and each next one starting `size - overlap` characters later. The last window ends at the end of the text; stop as soon as a window reaches it. An empty text has no chunks. Text is not trimmed.

## 2. `chunkRecursive(document, options)`

`options.separators` defaults to the exported `DEFAULT_SEPARATORS`: `['\n\n', '\n', '. ', ' ']`.

1. **Split.** A range that fits in `size` stays whole. A longer range is split after every occurrence of the first separator (the separator stays at the end of the piece before it); each piece that is still too long is split again with the next separator. When no separator is left, cut the piece into windows of `size` characters.
2. **Merge.** Walk the pieces in order and join consecutive ones into a chunk while the chunk (from its first piece's start to its last piece's end) fits in `size`.
3. **Overlap.** When a piece does not fit, close the current chunk. The next chunk starts with the last pieces of the closed one, taken from the end backwards while they span at most `overlap` characters and the new chunk still fits in `size` with the incoming piece.
4. **Trim.** Move each chunk's `start` forward and `end` backward past whitespace, and drop chunks that become empty.

The result: chunks fit in `size`, cover every word, never cut a word unless it is longer than `size` on its own, prefer paragraph and sentence boundaries, and neighbors share at most `overlap` characters.

## 3. `chunkMarkdown(document, options)`

A heading is a line that starts with 1 to 6 `#`, then spaces, then its title.

1. Split the text into sections. Text before the first heading is a section with `headingPath: []`. Each heading starts a section that runs until the next heading of any level.
2. The `headingPath` of a heading's section is the titles of its ancestors and itself: keep a stack and, for a heading of level `n`, pop every entry of level `n` or deeper before pushing it. `# Billing`, `## Refunds`, `### Refund requests` gives `['Billing', 'Refunds', 'Refund requests']`; a following `## Plans` gives `['Billing', 'Plans']`.
3. A section whose only content is its heading line produces no chunk (its title still enters the stack).
4. Chunk each section with the recursive algorithm (same `size`, `overlap` and default separators) inside the section's range, so no chunk crosses a section boundary. Every chunk of a section carries its `headingPath`, and ids keep counting across sections.
