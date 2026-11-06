# Data Governance for AI

Every model call is a data transfer. The prompt leaves your system, reaches a provider (or a model server you run), may be logged, cached or retained there, and comes back as output that may itself contain personal data. Data governance for AI decides, **before each call**, what may travel, for what reason and for how long anything derived from it is kept.

## Labels first

You cannot decide about data you cannot describe. Give every field (or document, or column) a **classification**, such as `public`, `internal`, `confidential`, `restricted`, and flag **personal data**, with special categories (health, biometrics, ethnicity, religion and others under GDPR and LGPD) at the top. Labels live in a catalog or schema, not in people's heads, so code can read them.

Fail closed: a field nobody labeled is treated as the most sensitive class. New columns get added every sprint; an allowlist of labeled fields keeps them out of prompts until someone decides.

## Purpose, consent and the legal basis

Data protection laws do not ask "is this data sensitive?" alone; they ask **why** you process it. Purpose limitation means data collected to handle a support ticket is not automatically available to train a model or write marketing copy.

- Each AI use case declares a **purpose**: `customer-support`, `fraud-review`, `marketing`.
- Each purpose has a **legal basis**. Consent is one of them; contract performance, legitimate interest and legal obligation are others (GDPR Article 6, LGPD Article 7). Where the basis is consent, it is per purpose: agreeing to support does not cover marketing.
- The purpose decides which fields may travel, the maximum classification, and the retention period.

```ts
checkModelCall({ record, subject, purpose: 'marketing' }, policy);
// { allowed: false, reasons: ['missing-consent'] }: refused before any byte reaches the provider
```

## Minimization and redaction

**Minimization** sends only the fields the purpose needs: the support reply needs the name, order and issue, not the email, tax id or referral source. **Redaction** (module 12's guardrails) removes or masks sensitive spans inside free text that must travel, such as a card number inside a ticket body. Use both: minimization for structured data, redaction for text you cannot structure. Retrieval follows the same rule: permission-aware retrieval (module 04) is minimization for documents.

## Where data goes

- **Provider terms:** whether prompts are used for training (business APIs usually opt out by default; consumer apps often do not), how long they are retained for abuse monitoring, and whether zero data retention is available.
- **Residency and transfers:** which region processes the call. Transfers out of the EU or Brazil need a transfer mechanism (adequacy decisions, standard contractual clauses; Brazil's ANPD published its own clauses).
- **Derived data:** embeddings, caches, traces, memories and fine-tuning sets are copies too. Classify and retain them like their source; personal data is hard to remove from model weights once trained in.

## Retention and erasure

Outputs, traces and memories that contain personal data need a **retention period** set by the purpose, and a job that enforces it. Record each processing (subject, purpose, fields, when, until when) at the moment it happens; retention then becomes a filter instead of an archaeology project, and a data subject's **erasure request** becomes a query over the same records. Remember module 10's traces and module 06's memories: they are the copies most often forgotten.

Model outputs about a person can be personal data themselves, including wrong ones: a generated summary that misattributes a debt is inaccurate personal data, with the same rights attached.

## Pitfalls

- Sending whole records "because the model might need context".
- One consent checkbox for every AI purpose.
- Purging the database but not the traces, caches, embeddings and memories derived from it.
- Training or fine-tuning on personal data without a plan for erasure requests.
- Assuming the provider's default retention matches your policy.

Check each provider's business terms: whether customer data is used for training, and whether zero data retention is available on request.

## When to choose it

Put a data gate in front of every model call that can see personal or confidential data, and declare purposes before the first such feature ships. Purely public data (documentation, public product catalogs) needs labels and provider review, not per-call purpose checks. Whenever a team asks to reuse AI data for a new purpose, treat it as a new purpose with its own basis, fields and retention.
