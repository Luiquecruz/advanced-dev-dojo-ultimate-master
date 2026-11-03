In `ownerOf`, return `owners[key]` when it is defined. Otherwise filter the keys that end with `*` and whose prefix (`pattern.slice(0, -1)`) starts `key`, sort them by length descending and take the first.
---
A `copy` helper (`JSON.parse(JSON.stringify(value))`) used on the way in (`write`) and on the way out (`read`, `log`, `snapshot`) is all the isolation the board needs. Keep the entries in a `Map` and the log in an array that only ever receives `push`.
---
In `write`, compute `current = read(key)` once, then check ownership, then the version, appending a log entry before each `return`. The accepted version is `current.version + 1`.
---
`contributeWithModel` is a `for` loop over attempts. Read the version **before** the model call; build the context with `Object.fromEntries([...readKeys, key].map((name) => [name, board.read(name).value]))`; after `write`, return on success or `not_owner`, and loop on `version_conflict`.
