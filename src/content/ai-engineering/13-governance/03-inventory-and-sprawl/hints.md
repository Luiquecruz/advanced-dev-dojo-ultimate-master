Keep the registry in a `Map` and spread every asset on the way in and on the way out (`{ ...asset }`), so no caller holds a reference to the stored object. Validate in `register` before storing: an unknown kind, a blank owner (`owner.trim() === ''`) and an `'api-key'` without `expiresAt` all throw.
---
In the audit, build a `Set` of active person ids first. Then for each non-retired asset push up to three kinds of findings: orphaned owner, expired or expiring (`Date.parse(expiresAt)` compared with `now` and `now + expiringWithinDays * DAY`), and stale for keys and agents (`now - Date.parse(lastUsedAt ?? createdAt) > staleAfterDays * DAY`).
---
Sort with a fixed issue order: `ISSUE_ORDER.indexOf(a.issue) - ISSUE_ORDER.indexOf(b.issue) || a.assetId.localeCompare(b.assetId)`.
---
For shadow AI, build three lookups (keys by id, models by name, agents by id) and one helper `check(lookup, value, unregisteredKind, entry)` that adds either the unregistered signal or `'retired-asset'`. Aggregate in a `Map` keyed by `` `${kind}:${value}` ``, then sort the values by calls, tokens and value.
