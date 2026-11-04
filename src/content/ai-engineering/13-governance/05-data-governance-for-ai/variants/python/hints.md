Rank classifications by index in `["public", "internal", "confidential", "restricted"]`. In `classify_record`, loop over the record's keys; a missing label adds the field to `"unlabeled"` and uses `"restricted"`. The highest level is `max(fields.values(), key=RANK.index, default="public")`.
---
In `check_model_call`, return early for an unknown purpose. Then check consent with `purpose in subject["consents"]`, build `payload` and `dropped_fields` in one pass over `record.items()` (allowed by the purpose and labeled by the policy), and finally check the ceiling on the payload's fields only.
---
`governed_generate` calls `check_model_call` first and raises `DataPolicyError(check["reasons"])` before touching the model. Read `now()` after the response arrives, compute `"expiresAt"` as `iso_timestamp(processed_at + retention_days * DAY_MS)`, and append the record only after `generate` returned, so a failed call stores nothing.
---
Retention and erasure are list comprehensions over the store: `parse_time_ms(record["expiresAt"]) <= now` for purging, `record["subjectId"] == subject_id` for erasure.
