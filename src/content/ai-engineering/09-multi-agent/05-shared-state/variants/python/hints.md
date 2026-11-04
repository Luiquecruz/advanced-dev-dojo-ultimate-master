In `owner_of`, return `owners[key]` when the key is in the dict. Otherwise keep the keys that end with `*` and whose prefix (`pattern[:-1]`) starts `key`, sort them with `key=len, reverse=True` and take the first.
---
`copy.deepcopy` on the way in (`write`) and on the way out (`read`, `log`, `snapshot`) is all the isolation the board needs. Keep the entries in a dict and the log in a list that only ever receives `append`.
---
In `write`, compute `current = self.read(key)` once, then check ownership, then the version, appending a log entry before each `return`. The accepted version is `current["version"] + 1`.
---
`contribute_with_model` is a `for attempt in range(1, max_attempts + 1)` loop. Read the version **before** the model call; build the context with `{name: board.read(name)["value"] for name in [*read_keys, key]}` and `json.dumps(context, indent=2)`; after `write`, return on success or `"not_owner"`, and loop on `"version_conflict"`.
