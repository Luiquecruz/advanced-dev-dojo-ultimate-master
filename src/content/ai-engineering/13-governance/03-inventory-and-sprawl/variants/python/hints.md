Keep the registry in a dict and copy every asset on the way in and on the way out (`dict(asset)`), so no caller holds a reference to the stored dict. Validate in `register` before storing: an unknown kind, a blank owner (`owner.strip() == ""`) and an `"api-key"` without `"expiresAt"` all raise.
---
In the audit, build a set of active person ids first. Then for each non-retired asset append up to three kinds of findings: orphaned owner, expired or expiring (`parse_time_ms(asset["expiresAt"])` compared with `now` and `now + expiring_within_days * DAY_MS`), and stale for keys and agents (`now - parse_time_ms(asset.get("lastUsedAt") or asset["createdAt"]) > stale_after_days * DAY_MS`).
---
Sort with a fixed issue order: `sorted(findings, key=lambda finding: (ISSUE_ORDER.index(finding["issue"]), finding["assetId"]))`.
---
For shadow AI, build three lookups (keys by id, models by name, agents by id) and one helper `check(lookup, value, unregistered_kind, entry)` that adds either the unregistered signal or `"retired-asset"`. Aggregate in a dict keyed by `(kind, value)`, then sort the values with the key `(-calls, -totalTokens, value)`.
