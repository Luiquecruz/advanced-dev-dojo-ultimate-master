# Permission-Aware Retrieval

A RAG assistant that can read every document in the company will eventually tell someone what it should not: salary bands to an intern, one customer's tickets to another customer, a deleted performance review to anyone. The model has no idea who is asking. **Permissions are enforced by the retriever, before ranking, on every query**, and the index must reflect changes to documents and access as soon as they happen.

## Where to enforce

| Place | Verdict |
| --- | --- |
| In the prompt ("do not reveal HR documents") | not a control: the text is already in context, and prompt injection or a plain mistake leaks it |
| After generation (filter the answer) | too late: the model has already combined the secret into its words |
| After ranking (drop forbidden results from the top k) | leaks through counts and fills topK with nothing; easy to forget on one code path |
| **Before ranking, inside the search** | correct: forbidden documents are never scored, never in context, never cited |

The rule: **never retrieve what the user cannot see.** If a passage is not in the context, no prompt, model or injection can disclose it.

## Tenants and ACLs

Two layers of access apply to every document:

- **Tenant isolation** (multi-tenant SaaS): a document belongs to one tenant, and a principal from another tenant never sees it, even with the same group names (`hr` at Acme is not `hr` at Globex). Options range from a filter on a `tenantId` field to a namespace, collection or index per tenant; physical separation is stronger and costs more to operate.
- **Access control lists (ACLs)**: inside a tenant, a document lists the groups and users allowed to read it. Copy the ACL from the source system (wiki, drive, ticketing tool) at ingestion, and **deny by default**: a document with no grants is visible to nobody, not to everybody.

```ts
canRead(principal, document) =
  principal.tenantId === document.tenantId &&
  (document.allowedUsers.includes(principal.userId) || document.allowedGroups.some((group) => principal.groups.includes(group)));
```

The principal comes from your authentication layer (a verified token), never from the request body or from the model.

## Updates and deletions

An index is a copy, and copies go stale:

- **Permission changes** must apply immediately. Store the ACL next to the vector and update it in place; re-embedding is unnecessary when the text did not change, so a revocation is cheap.
- **Content changes** replace the old chunks (by document id or source, lesson 02) and re-embed.
- **Deletions** remove every chunk of the document. A deleted document still answering questions is a "ghost": a privacy incident under laws with erasure rights, and a correctness bug everywhere.
- **Tenant moves and offboarding** must remove a tenant's data from every index, cache and log.

Sync from the source of truth with change events (webhooks, change data capture) where you can, and a periodic full reconciliation that catches what events missed. Measure the lag: "a revoked user can still read a document for up to N minutes" is a number your ADR should state.

## Beyond the index

- **Caches** (semantic caches, cached answers) must key on the principal or its permissions, or they replay one user's answer to another.
- **Logs and traces** contain retrieved passages; protect them like the documents.
- **Embeddings leak too**: inversion attacks can reconstruct text from vectors, so vector stores need the same access control as the documents themselves.

## Pitfalls

- Relying on the system prompt to keep secrets.
- Filtering after generation or after topK.
- A shared index where the tenant filter is optional on one code path.
- ACLs copied once at ingestion and never updated.
- Deleting the document in the source system but not its chunks, caches and logs.

Security guidance for LLM applications lists vector and embedding weaknesses, including cross-tenant leakage and embedding inversion. Managed vector stores offer namespaces or per-tenant partitions and filtered search, and enterprise search connectors can sync source ACLs. Data protection laws give people a right to erasure that reaches derived copies like indexes.

## When to choose it

Apply permission-aware retrieval whenever the corpus is not public to every user of the feature: any multi-tenant product, any internal assistant over HR, finance, legal or customer data. Choose a filter on a shared index for many small tenants, a namespace or index per tenant for large or regulated ones. Only a corpus that every user may read in full (public docs, a marketing site) can skip it, and even then deletions must reach the index.
