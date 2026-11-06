Turn each audit finding into one control before writing anything else: orphaned owners need `requireOwner`, shared keys need `perAgentIdentity` and no shared keys, keys without expiry need a TTL of at most 90 days, shadow AI needs a sanctioned alternative, the retry loop needs per-agent rate limits and hard limits, and 99.6% approvals need a smaller review queue, override tracking and an appeal path.
---
For the layers, think about where each control can run. Purpose checks, identity decisions and budgets sit on the path of every call (`runtime`); model promotion runs in CI; policy, regulation and audit reviews are processes. Choose owners so the auditor does not audit their own controls.
---
Read the numbers straight from the briefing: credentials and retention at most 90 days, inventory audit at most every 30 days, audit logs 5 years, review queue at most 80, review every 90 days, and a migration that starts by `2026-12-16` at the latest (30 days before `2027-01-15`). Budgets for the four features must sum to $12,000 or less.
---
For the regulatory map, credit-limit decisions trigger LGPD Art. 20 in Brazil and GDPR Art. 22 in Portugal today, and the AI Act's credit-scoring high-risk duties scheduled for later (`upcoming`). The support chatbot owes AI Act Art. 50 disclosure today. PL 2338/2023 is a bill: list it as `proposed` or leave it out.
