Build a tiny JSON file store with `node:fs/promises` (no `*Sync` calls).

1. `readJson<T>(path: string, fallback: T): Promise<T>`
   - returns the parsed content of the file;
   - returns `fallback` when the file does not exist (`ENOENT`);
   - rethrows every other error (invalid JSON, `EISDIR`, ...).
2. `writeJsonAtomic(path: string, data: unknown): Promise<void>`
   - creates missing parent folders;
   - writes `JSON.stringify(data, null, 2)` followed by a newline;
   - writes a temporary file in the same folder first and then `rename`s it over `path`, so no temporary file is left behind.
3. `addNote(path: string, text: string): Promise<Note>` reads the array of notes (an empty array when the file is missing), appends `{ id, text }` where `id` is the highest existing id + 1 (1 for the first note), saves with `writeJsonAtomic` and returns the new note.
