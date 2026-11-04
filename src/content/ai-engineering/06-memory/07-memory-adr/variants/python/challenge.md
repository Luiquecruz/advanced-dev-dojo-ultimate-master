Write the memory ADR for **Concierge**, the in-app support assistant of an EU mobile operator.

## Briefing

Concierge answers customers' questions about plans, bills, roaming and outages, in a chat inside the operator's app.

- **Users:** 400 000 customers in the EU. Household contracts are common: several people share one contract, but each person has their own chats and preferences, which other household members must not see.
- **Conversations:** 40 turns on average, up to 300 in long troubleshooting sessions. Customers come back every few weeks.
- **Token budget:** the model has a 32 000-token window, but the product caps memory at **6 000 tokens per call**: the conversation context plus the retrieved long-term memories. Retrieved memories average **80 tokens** each. Personalization needs at least **3** retrieved memories per call, and the conversation context needs at least **1 500** tokens so the latest turns always fit.
- **Questions customers ask:** preferences ("text me, don't call"), past incidents ("what did you find last time my internet dropped?") and time-dependent questions ("which plan was I on when you charged me in March?"). Facts change often: plans, addresses, devices.
- **Ranking:** contract facts from two years ago can still matter, while recent incidents matter more than old ones.
- **Untrusted input:** Concierge reads customers' emails, uploaded bills and public status pages.
- **Procedures:** troubleshooting playbooks are written by the support team. A change to a playbook must be reviewed before it is used.
- **Privacy:** the GDPR applies. The operator commits to complete erasure requests within **30 days**, including anything derived from the customer's data. Interaction memories may be kept for at most **365 days**.

Pilot results on a 240-question memory eval, with the production prompt:

| Long-term store | Preference questions | "At the time" questions | Retrieval p95 |
| --- | --- | --- | --- |
| `none` | 31% | 12% | 0 ms |
| `files` | 82% | 49% | 40 ms |
| `vector` | 90% | 58% | 60 ms |
| `temporal-graph` | 89% | 91% | 180 ms |

The target is at least **85%** on both question kinds, with a retrieval p95 of at most **250 ms**.

## Task

In `adr.py`, define two module-level dicts. Keys keep the same camelCase names as the JSON contract (`"procedureUpdates"`, `"keepRecentMessages"`, `"topK"`).

**`ADR`**, the record:

- `"id"`: a positive integer.
- `"title"`: at least 10 characters.
- `"status"`: `"accepted"`.
- `"layer"`: `"context"`.
- `"context"`: at least 80 characters; mentions tokens or the budget, time or change (temporal questions), and privacy, the GDPR or erasure.
- `"decision"`: at least 40 characters, starts with `We will`.
- `"alternatives"`: a list of at least two `{"option": ..., "reason": ...}` dicts with distinct `"option"` texts (at least 3 characters) and a `"reason"` of at least 20 characters.
- `"consequences"`: `{"positive": [...], "negative": [...]}`, each a list with at least one item of at least 15 characters.

**`MEMORY_PLAN`**, the plan:

- `"types"`: the memory types kept, from `"working"`, `"episodic"`, `"semantic"`, `"procedural"`.
- `"procedureUpdates"`: `"none"`, `"reviewed"` or `"automatic"`: how procedural memory changes.
- `"conversation"`: `{"strategy", "maxTokens", "keepRecentMessages"}`, with `"strategy"` one of `"full-history"`, `"sliding-window"`, `"running-summary"`, `"window-plus-summary"`.
- `"longTerm"`: `{"store", "topK", "weights": {"relevance", "recency", "importance"}}`, with `"store"` from the table.
- `"isolation"`: `"shared"`, `"per-contract"` or `"per-user"`.
- `"untrustedInstructions"`: `"allow"`, `"flag"` or `"reject"`.
- `"retentionDays"`: a number of days.
- `"erasure"`: `{"maxDays", "includesDerived"}`.

The plan must be coherent with the briefing:

1. `"types"` uses only valid names and keeps at least working, episodic and semantic memory; procedures never change automatically.
2. The conversation strategy can serve a 300-turn session within budget (no full history), keeps at least 2 recent messages, and gets at least 1 500 tokens.
3. `"maxTokens"` of the conversation plus `"topK"` × 80 is at most 6 000, with `"topK"` at least 3.
4. The store meets both 85% targets and the 250 ms p95; every weight is a positive number.
5. Isolation separates household members, instructions from untrusted sources are rejected, retention is between 1 and 365 days, and erasure completes within 30 days and includes derived data.

The tests check structure and coherence, not your wording.
