# Governance Layers

"AI governance" is often read as "data governance plus an ethics committee". In a system with agents, that leaves most of the risk unowned: which agents exist, what they may call, which model version answers, who pays, which law applies. Governance is a **stack of layers**. Each layer has its own concerns, its own owner and its own controls, and each control is enforced somewhere and leaves evidence.

## The layers

| Layer | Concerns | Typical controls | Usual owner |
| --- | --- | --- | --- |
| Organizational | who may use which AI for what; accountability | AI policy, acceptable use, inventory with owners, risk tiers, review board, training | CTO or AI governance lead |
| Regulatory and legal | obligations per jurisdiction and use case | regulatory map, standards (NIST AI RMF, ISO/IEC 42001), personal data laws, sector rules, licensing | legal and compliance |
| Data | what data reaches models and where it goes | classification, purpose and consent, minimization and redaction, residency, retention, provider training opt-out, permission-aware retrieval | data protection officer, data owners |
| Model | which models are approved and how they change | model registry, approval, model cards, version pinning, eval before promotion, deprecation plans, license checks | platform or ML team |
| Agent and identity | what agents can do on whose behalf | identity per agent, least privilege, delegation, short-lived scoped credentials, approval gates, kill switches, policy decision per tool call | platform and security |
| Application and output | what users see and how decisions are made | guardrails, human oversight for consequential decisions, AI disclosure, content provenance (C2PA), appeal paths | product team |
| Operational and cost | spend, capacity, reliability | budgets per team and feature, rate limits, FinOps for tokens, provider fallback, AI incident response | platform and finance |
| Engineering | how AI is used to build software | review and tests required for AI-assisted code, allowed tools and models, secrets hygiene, license scanning | engineering leadership |
| Audit and evidence | proving all of the above | tamper-evident logs of prompts, tool calls and decisions (with privacy), eval records, change history, periodic reviews | internal audit |

Some layers map to earlier modules: the agent layer reuses module 08's permissions and hooks, the data layer module 04's permission-aware retrieval and module 06's memory retention, the model layer module 10's regression gates. Governance adds what those modules left open: **an owner, a written rule, and evidence that it held**.

Layers are independent. A perfect data layer does not stop an unowned agent with an admin key; a strong agent layer does not stop a team pasting contracts into an unsanctioned chatbot. Audits fail at the weakest layer.

## The governance failures

**Shadow AI.** People use unsanctioned AI tools with company data, almost always because the sanctioned option is missing, slow or worse. Bans alone push usage further out of sight. The fix is a sanctioned tool that is actually good, plus visibility: gateway and proxy logs, expense reports, browser extension inventories.

**AI sprawl and agent sprawl.** Models, copilots, agents, MCP servers, prompts and API keys multiply with no owner. The symptoms: agents built for a pilot still running a year later, OAuth grants that outlive the employee who approved them, five teams paying for the same capability, and nobody able to answer "what touches customer data?". The fix is a registry with owners, credentials that expire, and a lifecycle that retires assets.

**Shared service accounts.** Ten agents calling tools with one API key means no attribution: the audit log says "the key did it". Every agent needs its own identity, and every action records whose behalf it acted on.

**Policy theater.** Documents with no runtime enforcement, committees that approve but never check. If you cannot point to the code or process that enforces a rule and the record it leaves, the rule does not exist.

**Rubber-stamp oversight.** A human "in the loop" who approves 400 suggestions a day is automation bias with a signature. Real oversight needs a manageable volume, the information to disagree, the authority to override, and measurement of how often the human does override.

## Enforcement points

Controls are only as strong as where they run:

- **Gateway** (every model call): identity, budgets, rate limits, data checks, model allowlists, logging.
- **Harness** (every tool call): policy decisions, approvals, redaction, audit.
- **CI and release** (every change): eval gates, model promotion, license and secret scans.
- **Process** (on a schedule): access reviews, inventory reviews, regulatory map reviews, incident drills.

Prefer the earliest automated point. Process controls are necessary for what code cannot judge, but each one should produce a record.

> **Status as of October 2026:** NIST's AI RMF (with its Generative AI Profile, NIST AI 600-1) and ISO/IEC 42001 (AI management systems) are the most cited governance frameworks; NIST's NCCoE runs a project on identity and authorization for software and AI agents. Identity providers and API gateways have started shipping agent identities and per-agent policies, and "agent sprawl" is an `emerging` term for what earlier waves called shadow IT.

## When to choose it

Use the layer table as a checklist whenever an AI feature moves toward production: for each layer, name the owner, the controls, where each control runs and what evidence it leaves. Start with the layers your risk actually touches (customer data, consequential decisions, external actions, spend), and grow the rest as usage spreads. A layer with no owner is the first finding of any audit.
