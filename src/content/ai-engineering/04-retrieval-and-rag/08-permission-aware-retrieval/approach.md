1. Write the access rule as a pure function and make it deny by default: a different tenant or no matching grant means no access. Treat tenant isolation as a separate, first check so equal group names in two tenants can never match.
2. Store the access data next to the vector. The search then decides visibility from the same record it ranks, with no second lookup that could drift.
3. Apply the rule inside the search, before scoring. Forbidden documents are never ranked, never counted, never sent to the model, and topK fills with documents the user may read.
4. Make updates cheap and immediate: an upsert replaces the whole record, and an access-only change reuses the stored vector, so revoking access costs no embedding call and applies on the next search.
5. Make deletions real: removing the record removes it from every later search.
6. Build the prompt only from what the permission-aware search returned, and skip the model entirely when the user can read nothing relevant. The model never sees text the user could not open themselves.
