Put a data gate in front of the model: label the fields of a record, check purpose and consent before any call, send only the fields the purpose needs, and keep processing records only as long as the purpose allows.

A **data policy** is `{ fields, purposes }`. `fields` maps a field name to `{ classification, personal }`; classifications rank `public < internal < confidential < restricted`. `purposes` maps a purpose name to `{ allowedFields, requiresConsent, maxClassification, retentionDays }`. A **subject** is `{ id, consents }`, where `consents` lists the purposes the person agreed to.

## 1. `classifyRecord(record, policy)`

Return `{ fields, highest, unlabeled }`: `fields` maps each field of the record (in record order) to its classification, `unlabeled` lists the fields the policy does not label, which count as `'restricted'` (fail closed), and `highest` is the highest classification present (`'public'` for an empty record).

## 2. `checkModelCall({ record, subject, purpose }, policy)`

- Unknown purpose: `{ allowed: false, reasons: ['unknown-purpose'] }`.
- Otherwise collect reasons, in this order: `'missing-consent'` when the purpose requires consent and the subject did not consent to **this** purpose; `'above-purpose-classification'` when a field that would be sent is classified above the purpose's `maxClassification`.
- Minimization: a field is sent only when the purpose allows it **and** the policy labels it. The payload keeps the record's values and order; `droppedFields` lists every other field in record order.
- With reasons: `{ allowed: false, reasons }`. Without: `{ allowed: true, payload, droppedFields }`. Never change the record.

## 3. `governedGenerate(model, { record, subject, purpose, instruction }, policy, { now, store })`

1. Check the call. If it is not allowed, throw a `DataPolicyError` (exported by the starter) carrying the reasons, and do not call the model.
2. Call `model.generate` with two messages: `{ role: 'system', content: instruction }` and `{ role: 'user', content: JSON.stringify(payload) }`.
3. Push a processing record `{ subjectId, purpose, fields, output, responseId, processedAt, expiresAt }` to `store`: `fields` are the payload's field names, `output` is the response text, `processedAt` is `now()` as an ISO string and `expiresAt` adds the purpose's `retentionDays`. Return `{ text, record }`.

Model errors propagate unchanged, and then nothing is stored.

## 4. `applyRetention(store, now)` and `eraseSubject(store, subjectId)`

`applyRetention` returns `{ kept, purged }`: records whose `expiresAt` is at or before `now` (milliseconds) are purged. `eraseSubject` returns `{ kept, erased }`: every record of that subject is removed and counted. Both keep the original order and do not change `store`.
