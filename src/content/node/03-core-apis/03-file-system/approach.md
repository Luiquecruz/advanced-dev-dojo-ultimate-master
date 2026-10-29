1. In `readJson`, separate the expected failure from the unexpected ones: only `ENOENT` means "no data yet"; invalid JSON and wrong entry types must surface.
2. Check `error.code`, not the message: codes are stable across Node versions and platforms.
3. In `writeJsonAtomic`, create the folder first so the write never fails with `ENOENT` on a fresh disk.
4. Write the full content to a temporary file in the same folder, then `rename` it over the target: readers see the old file or the new one, never a half-written one.
5. Build `addNote` from the two helpers: read with an empty-array fallback, compute the next id from the highest one (not the length, which breaks after deletions), save atomically.
6. Keep everything on `node:fs/promises` so no call blocks the event loop.
