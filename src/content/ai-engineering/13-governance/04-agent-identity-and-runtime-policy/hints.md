Build two maps in the decision point, agents by id (copied, so `suspend` can change status without touching the input) and tools by name. Handle the three short-circuit denials first, then push reason codes into a `denyReasons` array and an `askReasons` array; the first non-empty array decides.
---
Compare classifications by index in `['public', 'internal', 'confidential', 'restricted']`: the tool is above clearance when its index is greater than the agent's.
---
For the audit log, compute `previousHash` from the last stored entry, then `createHash('sha256').update(JSON.stringify([sequence, timestamp, previousHash, event])).digest('hex')`. Store a deep copy of the event (`JSON.parse(JSON.stringify(event))`) and return deep copies from `entries()`, so nobody holds a reference into the log.
---
`verifyAuditChain` loops once: for index `i`, the entry must have `sequence === i`, `previousHash` equal to the previous entry's `hash` (or `GENESIS_HASH`), and a `hash` equal to the recomputed one. Return the first index that fails. In `runGovernedToolCalls`, append the decision before running anything, and hash `toolCall.arguments` as the raw string.
