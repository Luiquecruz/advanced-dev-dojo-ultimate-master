Rank classifications by index in `['public', 'internal', 'confidential', 'restricted']`. In `classifyRecord`, loop over `Object.keys(record)`; a missing label adds the field to `unlabeled` and uses `'restricted'`. Reduce the values to the highest rank, starting from `'public'`.
---
In `checkModelCall`, return early for an unknown purpose. Then check consent with `subject.consents.includes(purpose)`, build `payload` and `droppedFields` in one pass over `Object.entries(record)` (allowed by the purpose and labeled by the policy), and finally check the ceiling on the payload's fields only.
---
`governedGenerate` calls `checkModelCall` first and throws `new DataPolicyError(check.reasons)` before touching the model. Read `now()` after the response arrives, compute `expiresAt` as `now + retentionDays * 24 * 60 * 60 * 1000`, and push the record only after `generate` resolved, so a failed call stores nothing.
---
Retention and erasure are two `filter` calls over the store: `Date.parse(record.expiresAt) <= now` for purging, `record.subjectId === subjectId` for erasure.
