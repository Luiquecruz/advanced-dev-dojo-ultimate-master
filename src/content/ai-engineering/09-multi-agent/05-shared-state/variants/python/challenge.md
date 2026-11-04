Build a blackboard that several agents share: an owner per key, compare-and-set versions, an append-only log you can rebuild state from, and an agent step that retries conflicts with fresh values.

`owners` maps keys to agent names. A key ending in `*` is a prefix pattern: `"findings:*"` covers `"findings:latency"`. Entries, results and log entries are plain dicts whose keys keep the JSON names (`"expectedVersion"`, `"currentVersion"`).

## 1. `owner_of(owners, key)`

Return the owner of `key`: the exact entry when there is one, otherwise the owner of the **longest** prefix pattern that matches, otherwise `None`.

## 2. `create_blackboard(owners)`

Return a `Blackboard` with four methods:

- `read(key)` returns `{"key", "value", "version", "writer"}`. A key never written is `{"key": key, "value": None, "version": 0, "writer": None}`.
- `write(agent, key, value, expected_version)`:
  1. if `agent` is not `owner_of(owners, key)`: `{"ok": False, "reason": "not_owner", "currentVersion": ...}`;
  2. else if `expected_version` is not the current version: `{"ok": False, "reason": "version_conflict", "currentVersion": ...}`;
  3. else store the value with the version plus one and `"writer": agent`, and return `{"ok": True, "version": ...}`.
- Every call to `write` appends one log entry `{"sequence", "agent", "key", "value", "expectedVersion", "accepted", "reason", "version"}`: `"sequence"` counts from 1, `"reason"` is `None` when accepted, and `"version"` is the new version when accepted or the current one when rejected.
- `log()` returns the entries in order; `snapshot()` returns a dict mapping every written key to its current value.
- Values are JSON data. Everything goes in and out **as a copy**: changing a value after writing it, or changing anything returned by `read`, `log` or `snapshot`, never changes the board.

## 3. `rebuild(log)`

Return the snapshot obtained by replaying the **accepted** entries in `"sequence"` order (the input may be in any order).

## 4. `contribute_with_model(agent, key, task, *, board, model, read_keys, max_attempts)`

One agent step, attempted up to `max_attempts` times:

1. Read `key` and remember its version.
2. Call `await model.generate(request)` with `[{"role": "system", "content": CONTRIBUTOR_SYSTEM}, {"role": "user", "content": content}]`, where `content` contains `task` and the current values of every key in `read_keys` and of `key`.
3. Write the reply text with the version read in step 1.
   - Accepted: return `{"ok": True, "version": ..., "attempts": ...}`.
   - `"not_owner"`: return `{"ok": False, "reason": "not_owner", "attempts": ...}` at once.
   - `"version_conflict"`: start again from step 1; after the last attempt return `{"ok": False, "reason": "version_conflict", "attempts": max_attempts}`.

The tests interleave writers, delays and conflicts, and check results, versions and the log, never the wording of model output.
