Build a multi-tenant index for an internal knowledge assistant that never retrieves what the asking user cannot see, and that reflects permission changes, edits and deletions on the next search. The seed documents and people are in `documents.ts`.

A **principal** (the authenticated user) is `{ userId, tenantId, groups }`. A **document** is `{ id, tenantId, text, allowedGroups, allowedUsers? }`.

## 1. `canRead(principal, document)`

`true` only when the principal's `tenantId` equals the document's, **and** the principal's `userId` is in `allowedUsers` or at least one of the principal's groups is in `allowedGroups`. Everything else is denied, including documents with no grants at all.

## 2. `createSecureIndex({ embedder })`

`embedder` maps a list of texts to a list of vectors; it defaults to `(texts) => embed(texts)` from `@dojo/ai`. The index has four operations:

- **`upsert(document)`**: stores the document with its vector, replacing any document with the same id (tenant, text and grants all change). When the stored document with that id has exactly the same text, reuse its vector instead of calling the embedder; otherwise embed the text with `embedder([text])`.
- **`remove(id)`**: deletes the document and returns `true`, or returns `false` for an unknown id.
- **`count()`**: the number of documents.
- **`search(principal, query, { topK = 3, minScore })`**: keeps **only the documents the principal can read**, then scores each against the query's embedding with cosine similarity, drops scores below `minScore` (no minimum when missing), sorts from highest to lowest and returns the first `topK` as `{ id, text, score }`. Readable documents are selected before ranking, so `topK` fills with readable documents whenever there are enough.

## 3. `answerQuestion(model, index, principal, question, { topK = 3, minScore = 0.1 })`

Search the index as the principal with those options. When nothing is found, return `{ answer: null, sourceIds: [] }` without calling the model. Otherwise call `model.generate` once with a `system` message (answer only from the sources, cite them as `[n]`) and a `user` message containing the passages numbered from 1 and the question, and return `{ answer: text, sourceIds }`, where `sourceIds` lists the ids of the passages sent, in order.
