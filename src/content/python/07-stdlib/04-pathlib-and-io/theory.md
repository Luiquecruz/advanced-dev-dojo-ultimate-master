`pathlib` represents paths as objects. **Pure** paths (`PurePosixPath`, `PureWindowsPath`) only manipulate text; a concrete `Path` adds file-system methods. The `/` operator joins:

```py
from pathlib import Path, PurePosixPath

key = PurePosixPath("reports") / "2026" / "q4.csv"   # 'reports/2026/q4.csv' on every OS
key.name, key.suffix, key.parent                      # ('q4.csv', '.csv', PurePosixPath('reports/2026'))

out = Path("/tmp/exports")
out.mkdir(parents=True, exist_ok=True)
(out / "notes.txt").write_text("Zoë\n", encoding="utf-8")
(out / "notes.txt").read_text(encoding="utf-8")       # 'Zoë\n'
```

`io.StringIO` and `io.BytesIO` are in-memory file objects with the same `read`/`write` interface as open files, which makes them the standard test double for streams.

## Coming from TypeScript and JavaScript

Node's `path.join` concatenates and normalizes. Python's `/` follows `os.path.join` instead: an absolute segment **discards** everything before it. The usual guard against it in Node is a string-prefix check, which has its own hole:

```ts
path.join("/srv/files", "/etc/passwd");            // '/srv/files/etc/passwd'
const full = path.resolve(base, name);
if (!full.startsWith(base)) throw new Error("escape"); // '/srv/files-evil/x' passes
```

```py
Path("/srv/files") / "/etc/passwd"                 # PosixPath('/etc/passwd')
Path("/srv/files") / "../secret"                   # PosixPath('/srv/files/../secret'), not normalized
str(full).startswith(str(base))                    # the same prefix hole as in Node
```

The mistake is treating paths as strings: joining with `/` and checking with `startswith`. Paths have structure (parts, `..`, links), and only path methods respect it.

## How it works

- **`resolve()`** makes a path absolute, removes `..` and follows symbolic links. **`is_relative_to(other)`** compares parts, not characters, so `/srv/files-evil` is not inside `/srv/files`. It is purely textual and does not interpret `..` itself, so it only means something on resolved paths.
- **Text vs binary**: `open(path, "w", encoding="utf-8")` encodes `str`, `"rb"`/`"wb"` move `bytes`. Without `encoding`, Python 3.14 uses the locale encoding (often cp1252 on Windows), so always pass it. The `csv` docs require `newline=""`, because the `csv` module writes its own line endings and must see line breaks inside quoted cells.
- **Streaming**: `read(n)` returns at most `n` bytes and `b""` at the end. Copying chunk by chunk keeps memory flat whatever the size; `shutil.copyfileobj(source, target, length)` is the stock loop. `read()` without a size loads everything, which is the `readFileSync` habit.
- **`tempfile`**: `TemporaryDirectory()` and `mkstemp()` create unique names with owner-only permissions and no race on creation.

## Security note

A name that comes from a request is untrusted: `"../x"`, `"/etc/passwd"`, `"a/../../x"` or a symbolic link inside the directory can all point outside it (path traversal). Resolve first, then compare:

```py
def safe_join(base, name):
    root = base.resolve()
    target = (root / name).resolve()
    if not target.is_relative_to(root):
        raise ValueError("path escapes the base directory")
    return target
```

The check and the later `open` are two steps, so also keep the directory writable only by the service, or an attacker who can create links there can swap one in between. Predictable names in a shared `/tmp` are the same risk: another user can create the file or a link first, which is why `tempfile.mktemp()` is deprecated in favor of `mkstemp()`. In this track the file system is Pyodide's in-memory one, so `/tmp` is private, but code written here should be safe on a real host.

> **Status as of November 2026:** Python 3.14 added `Path.copy()`, `copy_into()`, `move()` and `move_into()`, and the `Path.info` attribute that caches file-type queries. Python 3.15 turns on UTF-8 mode by default (PEP 686), so `encoding` defaults to UTF-8 there; this track runs 3.14, where it does not.

## When to choose it

- **`Path`** for files on disk, **`PurePosixPath`** for keys, URLs and archive members that must use `/` everywhere.
- **`resolve()` + `is_relative_to()`** whenever any part of a path comes from outside the program.
- **`csv`, `json` and `tomllib`** for structured files, never `",".join(...)`.
- **Chunked copies** (`shutil.copyfileobj`) for uploads and downloads of unknown size; `read_bytes()` only for files you know are small.
- **`tempfile`** for scratch files, never hand-made names in `/tmp`.
