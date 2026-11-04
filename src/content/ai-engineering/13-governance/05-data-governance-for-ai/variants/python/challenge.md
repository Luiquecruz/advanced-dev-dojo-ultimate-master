Put a data gate in front of the model: label the fields of a record, check purpose and consent before any call, send only the fields the purpose needs, and keep processing records only as long as the purpose allows.

A **data policy** is a dict `{"fields", "purposes"}`. `"fields"` maps a field name to `{"classification", "personal"}`; classifications rank `public < internal < confidential < restricted`. `"purposes"` maps a purpose name to `{"allowedFields", "requiresConsent", "maxClassification", "retentionDays"}`. A **subject** is `{"id", "consents"}`, where `"consents"` lists the purposes the person agreed to. Keys keep the JSON names (camelCase); functions and parameters use Python names. `iso_timestamp(milliseconds)` and `parse_time_ms(text)` are provided.

## 1. `classify_record(record, policy)`

Return `{"fields", "highest", "unlabeled"}`: `"fields"` maps each field of the record (in record order) to its classification, `"unlabeled"` lists the fields the policy does not label, which count as `"restricted"` (fail closed), and `"highest"` is the highest classification present (`"public"` for an empty record).

## 2. `check_model_call(input, policy)`

`input` is `{"record", "subject", "purpose"}`.

- Unknown purpose: `{"allowed": False, "reasons": ["unknown-purpose"]}`.
- Otherwise collect reasons, in this order: `"missing-consent"` when the purpose requires consent and the subject did not consent to **this** purpose; `"above-purpose-classification"` when a field that would be sent is classified above the purpose's `"maxClassification"`.
- Minimization: a field is sent only when the purpose allows it **and** the policy labels it. The payload keeps the record's values and order; `"droppedFields"` lists every other field in record order.
- With reasons: `{"allowed": False, "reasons": reasons}`. Without: `{"allowed": True, "payload": payload, "droppedFields": dropped_fields}`. Never change the record.

## 3. `await governed_generate(model, input, policy, *, now, store)`

`input` is `{"record", "subject", "purpose", "instruction"}`; `now()` returns milliseconds; `store` is a list.

1. Check the call. If it is not allowed, raise a `DataPolicyError` (provided) carrying the reasons, and do not call the model.
2. Call `model.generate` with two messages: `{"role": "system", "content": instruction}` and `{"role": "user", "content": <the payload as compact JSON>}` (`json.dumps(payload, separators=(",", ":"), ensure_ascii=False)`).
3. Append a processing record `{"subjectId", "purpose", "fields", "output", "responseId", "processedAt", "expiresAt"}` to `store`: `"fields"` are the payload's field names, `"output"` is the response text, `"responseId"` the response id, `"processedAt"` is `now()` as an ISO string and `"expiresAt"` adds the purpose's `"retentionDays"`. Return `{"text", "record"}`.

Model errors (`ModelError`) propagate unchanged, and then nothing is stored.

## 4. `apply_retention(store, now)` and `erase_subject(store, subject_id)`

`apply_retention` returns `{"kept", "purged"}`: records whose `"expiresAt"` is at or before `now` (milliseconds) are purged. `erase_subject` returns `{"kept", "erased"}`: every record of that subject is removed and counted. Both keep the original order and do not change `store`.
