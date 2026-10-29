# The File System

Servers read config, write uploads, keep caches and logs. `node:fs` gives three flavors of the same operations:

| Style | Example | Use it for |
| --- | --- | --- |
| Promises | `await readFile(path, 'utf8')` from `node:fs/promises` | application code (the default) |
| Callbacks | `readFile(path, 'utf8', (err, data) => ...)` from `node:fs` | legacy code |
| Sync | `readFileSync(path, 'utf8')` | startup scripts and CLIs only |

The sync functions block the event loop: while a 50 MB file is read synchronously, the server answers no one. They are fine before `listen()` (loading config once) and in command-line tools, never inside a request handler.

## Reading and writing JSON

```ts
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const settings = JSON.parse(await readFile('data/settings.json', 'utf8'));

await mkdir(dirname('data/out/report.json'), { recursive: true });
await writeFile('data/out/report.json', JSON.stringify(settings, null, 2) + '\n');
```

Pass an encoding (`'utf8'`) to get a string; without it you get a `Buffer`. `mkdir` with `recursive: true` creates missing parents and does not fail when the folder exists. Relative paths resolve against `process.cwd()`, the folder the process was started from, not the file's folder: real code builds paths from a known root (next lesson).

## Errors have codes

File-system errors carry a stable `code`. Branch on it, never on the message:

| Code | Meaning | Typical handling |
| --- | --- | --- |
| `ENOENT` | no such file or directory | use a default, return 404 |
| `EEXIST` | already exists (`mkdir`, `writeFile` with flag `wx`) | conflict, pick another name |
| `EISDIR` / `ENOTDIR` | wrong kind of entry | bug or bad input |
| `EACCES` / `EPERM` | permission denied | configuration problem: fail loudly |

```ts
async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw error;
  }
}
```

Only the expected case is swallowed. A `catch {}` that returns the fallback for **every** error hides corrupted JSON and permission problems until data is silently overwritten.

Avoid "check then act": `if (existsSync(path)) readFile(path)` has a race (the file can disappear in between) and costs two system calls. Just try the operation and handle `ENOENT`.

## Atomic writes

`writeFile` truncates the file and then writes. If the process crashes or another reader looks at the file in between, it sees an empty or half-written file. The standard fix: write a temporary file in the **same directory**, then `rename` it over the target. On POSIX file systems a rename within one file system is atomic: readers see the old file or the new one, never a mix.

```ts
const temporary = `${path}.${process.pid}.tmp`;
await writeFile(temporary, content);
await rename(temporary, path);
```

Atomic writes do not solve **concurrent updates**: two requests that read, modify and write the same file at the same time still lose one update. That needs a lock, a queue, or (usually the right answer) a database.

## Watch out in production

- Containers and serverless platforms often have read-only or ephemeral disks: files written there vanish on redeploy and are not shared between instances.
- Large files belong in streams (lesson 5), not in `readFile`.
- User-supplied file names must be checked against path traversal (lesson 4).

## Legacy vs modern

Callback APIs and `fs.exists` (deprecated) appear in old code and old answers. Modern code uses `node:fs/promises`, `await`, `mkdir({ recursive: true })`, `rm({ recursive: true, force: true })` instead of `rimraf`, and `readdir({ recursive: true })` instead of hand-written walkers.

## When to choose it

Use the file system for configuration, static assets, temporary files, local caches, exports and CLIs. Do not use it as the database of a web API: no concurrent writes, no queries, no sharing between instances, often no persistence in the cloud. Use a database for records, object storage (S3, R2, GCS) for uploads, and keep local files for what can be rebuilt.

## Working with AI

Say which runtime the files live on (local disk, container, serverless) and whether several instances run. Review generated code for:

- `*Sync` calls inside request handlers;
- `catch` blocks that swallow every error instead of checking `error.code`;
- `existsSync` followed by a read or write (race);
- writes of important files without temp file + `rename`;
- read-modify-write of a shared JSON file from concurrent requests;
- paths built from `__dirname` assumptions or from raw user input.
