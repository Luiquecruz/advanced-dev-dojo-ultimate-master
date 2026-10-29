Wrap `JSON.parse(await readFile(path, 'utf8'))` in `try/catch`. In the `catch`, compare `error.code` with `'ENOENT'` and return the fallback only in that case; otherwise `throw error`.
---
`writeJsonAtomic` is three awaits: `mkdir(dirname(path), { recursive: true })`, `writeFile(temporary, content)` and `rename(temporary, path)`, with `temporary` such as `` `${path}.tmp` ``.
---
`addNote`: `const notes = await readJson<Note[]>(path, [])`, then `Math.max(0, ...notes.map((note) => note.id)) + 1` as the id, then `writeJsonAtomic(path, [...notes, note])` and return the note.
