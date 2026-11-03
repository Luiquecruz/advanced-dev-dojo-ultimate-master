Write the prompt and context ADR for **Claim Intake**, the feature that turns damage-claim emails into records for an automatic refund service.

## Briefing

Parcelly customers report damaged parcels by email. Claim Intake extracts a record (order id, damage type out of 14, claimed amount, photos present) that the refund service consumes directly.

- **Live volume:** about 40 000 claims a day. The customer waits on a confirmation page: the extraction must finish within **3 000 ms p95**.
- **Backfill:** once, 1 200 000 historical claims must be re-extracted for an audit due in two weeks. Nobody waits for individual results. The backfill budget is **$6 000**.
- **Output:** the refund service rejects any record that does not match its schema. The provider supports schema-constrained JSON output. At least **99.5%** of live claims must yield a valid record; the rest go to a human queue.
- **Pilot, attempts:** each model call takes up to **1 100 ms p95**. With validation and a re-ask on failure, the share of claims with a valid record was 96.5% after 1 attempt, 99.6% after 2 and 99.8% after 3.
- **Pilot, examples:** damage-type accuracy was 74% with no examples, 81% with 3 fixed examples and 93% with 3 to 6 examples selected by similarity from a pool of 900 labeled claims (fewer than 3 dropped it to 86%). The target is **90%**. Examples may use at most **800 tokens** per request.
- **Context:** the model has a **32 000-token** context window. Records take up to 700 output tokens. Emails often attach carrier reports of up to 20 000 tokens; accuracy fell sharply when more than **4 000 tokens** of a report were included.
- **Prompt parts:** `instructions` (2 000 tokens, the same for every claim), `output-schema` (400 tokens, the same for every claim), `examples`, `attachment` and `claim` (the email itself). The provider caches exact prefixes.
- **Pricing:** a claim averages 3 000 input and 300 output tokens at $2 per million input and $8 per million output tokens. The batch API costs **50%** of the interactive price and returns results within 24 hours.
- **Releases:** last quarter an edited prompt broke the refund service for a day. Every prompt version must now pass its tests in **staging** before **production**.

## Task

In `adr.ts`, export two constants.

**`adr`**, the record:

- `id`: a positive integer; `title`: at least 10 characters; `status`: `'accepted'`; `layer`: `'context'`.
- `context`: at least 80 characters; mentions latency, cost or budget, and the schema or structured output.
- `decision`: at least 40 characters, starts with `We will`.
- `alternatives`: at least two `{ option, reason }` entries with distinct `option` texts (at least 3 characters) and a `reason` of at least 20 characters.
- `consequences`: `{ positive, negative }`, each a list with at least one item of at least 15 characters.

**`promptPlan`**, the plan:

- `promptVersion`: `'claim-intake@<major>.<minor>.<patch>'`.
- `environments`: the environments a version passes through, in order.
- `output`: `{ mode, validateLocally, maxAttempts }`, where `mode` is `'text'`, `'json-mode'` or `'json-schema'`.
- `examples`: `{ strategy, count, maxTokens }`, where `strategy` is `'none'`, `'static'` or `'similarity'`.
- `layout`: the five prompt parts in the order they are sent.
- `cacheBreakpointAfter`: the part that ends the cached prefix.
- `context`: `{ inputBudgetTokens, outputReserveTokens, maxAttachmentTokens }`.
- `processing`: `{ live, backfill }`, each `'interactive'` or `'batch'`.
- `backfillCostUsd`: the projected cost of the backfill: `1 200 000 × (3 000 × $2 + 300 × $8) / 1 000 000`, times `0.5` when the backfill uses the batch API.

The plan must be coherent with the briefing:

1. The output uses the provider's schema-constrained mode and is still validated locally; `maxAttempts` reaches 99.5% valid records and keeps `maxAttempts × 1 100 ms` within the 3 000 ms budget.
2. The example strategy reaches the 90% target with a count in the measured range, within the 800-token example budget.
3. The layout sends every part once, the claim last, and every part that is the same for every claim before any part that varies; the cache breakpoint is the last of those stable parts. Examples vary per claim unless the strategy is `'static'`.
4. The input budget plus the output reserve fit the context window, the reserve covers the largest record, and attachments are capped at the size where accuracy held.
5. Live claims run interactively; the backfill uses whatever fits its budget and deadline. The cost projection is within 10% of the formula and at most $6 000.
6. Versions go through staging before production.

The tests check structure and coherence, not your wording.
