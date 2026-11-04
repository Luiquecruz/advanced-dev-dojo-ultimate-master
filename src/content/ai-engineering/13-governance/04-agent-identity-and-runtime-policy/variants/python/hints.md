Build two dicts in the decision point, agents by id (copied, so `suspend` can change `"status"` without touching the input) and tools by name. Handle the three short-circuit denials first, then append reason codes to a `deny_reasons` list and an `ask_reasons` list; the first non-empty list decides.
---
Compare classifications by index in `["public", "internal", "confidential", "restricted"]`: the tool is above clearance when its index is greater than the agent's.
---
For the audit log, take `previous_hash` from the last stored entry, then `hashlib.sha256(compact_json([sequence, timestamp, previous_hash, event]).encode("utf-8")).hexdigest()`. Store a deep copy of the event (`copy.deepcopy(event)`) and return deep copies from `entries()`, so nobody holds a reference into the log.
---
`verify_audit_chain` loops once with `enumerate`: entry `index` must have `"sequence" == index`, `"previousHash"` equal to the previous entry's `"hash"` (or `GENESIS_HASH`), and a `"hash"` equal to the recomputed one. Return the first index that fails. In `run_governed_tool_calls`, append the decision before running anything, and hash `tool_call["arguments"]` as the raw string.
