Build a multi-tenant index for an internal knowledge assistant that never retrieves what the asking user cannot see, and that reflects permission changes, edits and deletions on the next search. The seed documents and people are in `documents.py`.

A **principal** (the authenticated user) is a dict `{"userId", "tenantId", "groups"}`. A **document** is a dict `{"id", "tenantId", "text", "allowedGroups"}` with an optional `"allowedUsers"` list.

## 1. `can_read(principal, document)`

`True` only when the principal's `"tenantId"` equals the document's, **and** the principal's `"userId"` is in `"allowedUsers"` or at least one of the principal's groups is in `"allowedGroups"`. Everything else is denied, including documents with no grants at all.

## 2. `create_secure_index(embedder=None)`

`embedder` maps a list of texts to a list of vectors; it defaults to `embed` from `dojo_ai`. The function returns a `SecureIndex` with four methods:

- **`upsert(document)`**: stores the document with its vector, replacing any document with the same id (tenant, text and grants all change). When the stored document with that id has exactly the same text, reuse its vector instead of calling the embedder; otherwise embed the text with `embedder([text])`.
- **`remove(document_id)`**: deletes the document and returns `True`, or returns `False` for an unknown id.
- **`count()`**: the number of documents.
- **`search(principal, query, *, top_k=3, min_score=None)`**: keeps **only the documents the principal can read**, then scores each against the query's embedding with `cosine_similarity` from `dojo_ai`, drops scores below `min_score` (no minimum when it is `None`), sorts from highest to lowest and returns the first `top_k` as `{"id", "text", "score"}` dicts. Readable documents are selected before ranking, so `top_k` fills with readable documents whenever there are enough.

## 3. `async answer_question(model, index, principal, question, *, top_k=3, min_score=0.1)`

Search the index as the principal with those options. When nothing is found, return `{"answer": None, "sourceIds": []}` without calling the model. Otherwise `await model.generate(...)` once with a `system` message (answer only from the sources, cite them as `[n]`) and a `user` message containing the passages numbered from 1 and the question, and return `{"answer": text, "sourceIds": ids}`, where `"sourceIds"` lists the ids of the passages sent, in order.
