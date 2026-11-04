Write the governance ADR for **Lumen Pay**, a Brazilian fintech that is about to take its AI features to Europe.

## Briefing

Lumen Pay serves 2.1 million consumers in Brazil from São Paulo and launches in **Portugal (EU)** in March 2027. It has no plans for other markets.

- **AI features:** `support-chat` (a customer support chatbot), `credit-limit` (an agent that proposes credit-limit changes for consumers), `collections-email` (drafts collection emails sent to customers) and `coding-assistant` (used by 80 engineers).
- **Audit findings:** 23 agents tracked in a spreadsheet, 9 of them with owners who left; 3 API keys shared by every agent, none with an expiry date; marketing pastes customer lists into a personal chatbot subscription because no sanctioned assistant exists; last quarter AI spend ran 40% over plan, mostly from one agent stuck in a retry loop.
- **Credit oversight:** analysts approve 99.6% of the agent's suggestions, about 600 per analyst per day. The credit risk team says an analyst can review at most **80 cases per day** carefully. Customers have no way to appeal.
- **Models:** the pinned model `acme-large-2026-03` retires on **2027-01-15**. Migrations must start at least **30 days** before a retirement. Required eval suites before any promotion: `support-golden`, `credit-fairness`, `refusal-safety`.
- **Policies:** credentials expire within **90 days**; the AI inventory is audited at least **monthly**; AI outputs and traces with personal data are kept at most **90 days**; audit logs are kept **5 years** and must be tamper-evident; the provider must not train on Lumen Pay data.
- **Budget:** at most **$12,000 per month** for all AI usage.
- **Regulation:** the board wants the regulatory map reviewed **every quarter**.
- **Owners available:** `cto`, `ai-platform-team`, `data-protection-officer`, `legal-compliance`, `security-team`, `credit-product-team`, `support-product-team`, `finance-finops`, `engineering-leadership`, `internal-audit`.

## Task

In `adr.ts`, export two constants.

**`adr`**: `id` (positive integer), `title` (at least 10 characters), `status: 'accepted'`, `layer: 'governance'`, `context` (at least 80 characters, mentioning the sprawl findings, such as owners, shared keys or shadow AI, and the regulation: LGPD, GDPR or AI Act), `decision` (at least 40 characters, starting with `We will`), at least two `alternatives` `{ option, reason }` with distinct options and reasons of at least 20 characters, and `consequences: { positive, negative }` with at least one item of at least 15 characters each.

**`governancePlan`**:

- `layers`: one entry per layer `organizational`, `regulatory`, `data`, `model`, `agent-identity`, `application`, `operational-cost`, `engineering`, `audit`, each `{ layer, owner, controls, enforcement, evidence }` with an owner from the list, at least one control, `enforcement` `'runtime'`, `'ci'` or `'process'`, and evidence of at least 10 characters.
- `inventory: { requireOwner, credentialMaxTtlDays, auditEveryDays, shadowAiResponse }` (`'sanctioned-alternative'`, `'ban-only'` or `'ignore'`).
- `identity: { perAgentIdentity, sharedKeysAllowed, decisionPoint, defaultEffect, auditLog, auditRetentionYears, killSwitch }` (`decisionPoint`: `'every-tool-call'`, `'session-start'` or `'none'`; `auditLog`: `'hash-chained'` or `'plain'`).
- `data: { purposes, minimization, retentionDays, providerTraining }`: `purposes` are `{ name, feature, legalBasis }` with a basis from `consent`, `contract`, `legitimate-interest`, `legal-obligation`, `credit-protection` (an LGPD basis); `minimization` is `'allowlist'`, `'blocklist'` or `'none'`; `providerTraining` is `'opted-out'` or `'allowed'`.
- `models: { pinnedVersions, requiredEvals, maxRegression, migrationStartBy }` (`migrationStartBy` is an ISO date).
- `cost: { monthlyLimitUsd, budgets, alertThresholds, hardLimit, rateLimitPerAgent }` with budgets `{ id, team?, feature?, limitUsd }`.
- `oversight: { creditDecisions, reviewQueueMaxPerAnalystPerDay, overrideRateTracked, appealPath }` (`creditDecisions`: `'human-review-all'`, `'human-review-adverse'` or `'none'`).
- `regulatory: { markets, reviewEveryDays, obligations }` with obligations `{ feature, jurisdiction, instrument, status }`, `status` being `'applies'`, `'upcoming'` or `'proposed'`.

The plan must be coherent with the briefing:

1. Every layer appears once. Data, agent identity and cost are enforced at `runtime`; the model layer in `ci` or at `runtime`. The data layer belongs to the data protection officer and the regulatory layer to legal; the audit layer's owner is independent of the agent-identity owner and of the AI platform team.
2. Inventory and identity fix every audit finding and follow the policies; shadow AI gets a sanctioned alternative; agents get their own identities behind a deny-by-default decision on every tool call, with a hash-chained log kept as long as the policy says and a kill switch.
3. Each customer-facing feature has a purpose and legal basis (a marketing purpose, if you add one, uses consent); minimization by allowlist; retention and provider training follow the policies. Models are pinned, every required suite gates promotion, `maxRegression` is at most 0.05, and the migration starts in time.
4. Budgets cover all four features and add up to at most the monthly limit, which respects the briefing; some alert fires before the limit; hard limits and per-agent rate limits are on.
5. Credit decisions keep human review at a sustainable volume, with override tracking and an appeal path. The markets are exactly Brazil and the EU, reviewed quarterly; the obligations include LGPD Art. 20 and GDPR Art. 22 for `credit-limit` (both apply today), the EU AI Act for `credit-limit` (upcoming) and AI Act Art. 50 for `support-chat` (applies). Bills such as PL 2338/2023, if listed, are `proposed`.

The tests check structure and coherence, not your wording.
