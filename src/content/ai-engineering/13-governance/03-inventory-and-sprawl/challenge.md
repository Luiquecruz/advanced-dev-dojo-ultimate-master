Build the inventory side of AI governance: a registry of AI assets with owners, an audit that finds orphaned assets and credential problems, and a detector that turns gateway logs into shadow AI signals.

An **asset** is `{ id, kind, name, owner, createdAt, expiresAt?, lastUsedAt?, retiredAt? }`. `kind` is one of `'model'`, `'agent'`, `'prompt'`, `'mcp-server'`, `'api-key'`; dates are ISO strings. A **person** is `{ id, active }`. A **gateway log entry** is `{ timestamp, keyId, model, agentId?, source, totalTokens }`.

## 1. `createRegistry()`

Return `{ register, get, list, transferOwnership, retire }`:

- `register(asset)` stores the asset and returns a copy. It throws when the id is already registered, the kind is unknown, the owner is missing or blank, or an `'api-key'` has no `expiresAt` (every credential expires).
- `get(id)` returns a copy, or `undefined`. `list(kind?)` returns copies in registration order, optionally filtered by kind. Changing a returned object never changes the registry.
- `transferOwnership(id, owner)` and `retire(id, at)` update the stored asset (`owner`, or `retiredAt: at`) and return a copy. Both throw for an unknown id.

## 2. `auditInventory(assets, people, { now, staleAfterDays = 90, expiringWithinDays = 14 })`

`now` is a timestamp in milliseconds. Skip retired assets. Return findings `{ assetId, issue, detail }` (`detail` is a short explanation):

- `'orphaned'`: the owner is not an active person (left the company or never existed).
- `'expired'`: `expiresAt` is at or before `now`.
- `'expiring'`: `expiresAt` is after `now` and at most `expiringWithinDays` days later.
- `'stale'`: only for `'api-key'` and `'agent'`: the last activity (`lastUsedAt`, or `createdAt` when never used) is more than `staleAfterDays` days before `now`.

An asset can have several findings. Sort by issue in the order above, then by `assetId`.

## 3. `logEntryFrom(response, { keyId, agentId?, source, timestamp })`

Build a gateway log entry from a model response: `model` is the model the response reports and `totalTokens` comes from its usage. Include `agentId` only when given.

## 4. `detectShadowAi(assets, log)`

Check each entry against the registry: `keyId` against `'api-key'` ids, `model` against `'model'` **names**, and `agentId` (when present) against `'agent'` ids. A value that is not registered gives a signal of kind `'unregistered-key'`, `'unregistered-model'` or `'unregistered-agent'`; a registered but retired asset gives `'retired-asset'` with the asset id as the value. One entry can produce several signals.

Aggregate per kind and value into `{ kind, value, calls, totalTokens, sources }` (`sources` sorted, without duplicates) and sort by `calls` descending, then `totalTokens` descending, then `value`.

The tests build gateway logs from fake model responses and check findings and signals, never model wording.
