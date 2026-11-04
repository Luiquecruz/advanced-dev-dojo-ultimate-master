# What Changed

This track separates a **stable core** (retrieval, evals, loops, injection, governance layers) from a **volatile edge** (protocol revisions, tools, laws, vendor features), which lives in the "Status as of" boxes. This lesson is the edge's changelog: dated changes that affected what the track teaches, newest first, so a returning learner can see the delta since their last visit instead of rereading fourteen modules.

## How the changelog works

- **Review cadence: quarterly.** Every quarter the status boxes are checked against primary sources (specifications, official announcements, the legal text) and this page gets a new section. The current survey is **October 2026**; the next review is due in **January 2027**.
- **One line per change**: the date, what changed, and the module whose lessons it touches. A change earns a line only if it changes what an engineer should do or know, not because it was announced loudly.
- **Dates are the event's own date** (a specification's publication, a law's entry into force), not when it was reported.
- **Nothing is deleted.** Superseded entries stay, so the page doubles as a short history of the field.

The quarterly checklist: protocol versions (MCP, A2A, Agent Skills, AGENTS.md), the OWASP lists, regulation (EU AI Act, LGPD and PL 2338, US state laws), model families and context sizes, framework and tool names, prices, and the research cited in the evaluation and impact lessons.

## Changelog

### Q4 2026 (survey of October 2026)

| Date | Change | Modules |
| --- | --- | --- |
| Oct 2026 | Agent Skills, Open Responses, OpenEnv and OpenSandbox join the Agentic AI Foundation, which now hosts ten projects | 03, 14 |

### Q3 2026

| Date | Change | Modules |
| --- | --- | --- |
| Aug 2026 | GitHub Spec Kit reaches version 1.0 | 14 |
| Aug 2026 | A2A joins the Agentic AI Foundation | 03, 09 |
| 2 Aug 2026 | EU AI Act transparency duties (Article 50) apply; marking of content from generative systems already on the market has a grace period to 2 December 2026 | 13, 14 |
| Jul 2026 | MCP revision 2026-07-28: stateless requests with the version in `_meta`, `server/discover`, cacheable list results; sampling, roots and logging deprecated | 03, 14 |
| 27 Jul 2026 | The Digital Omnibus on AI (Regulation (EU) 2026/1744) enters into force, moving EU AI Act high-risk obligations to 2 December 2027 (Annex III) and 2 August 2028 (Annex I) | 13 |

### Q2 2026

| Date | Change | Modules |
| --- | --- | --- |
| Jun 2026 | "Loop engineering" spreads after Addy Osmani's essay; coding agents ship loop and goal primitives | 08 |

### Q1 2026

| Date | Change | Modules |
| --- | --- | --- |
| Mar 2026 | A2A publishes its first stable specification, 1.0 | 03, 09 |
| Feb 2026 | METR reports its follow-up productivity data as unreliable and redesigns the study | 14 |
| Feb 2026 | Karpathy proposes "agentic engineering" for the disciplined practice; Simon Willison adopts it | 14 |
| Feb 2026 | OpenAI's "Harness engineering" article popularizes the term | 08 |

### 2025

| Date | Change | Modules |
| --- | --- | --- |
| Dec 2025 | OWASP publishes the Top 10 for Agentic Applications for 2026 (ASI01 Agent Goal Hijack first) | 12 |
| Dec 2025 | The Linux Foundation announces the Agentic AI Foundation with MCP, goose and AGENTS.md | 03 |
| Nov 2025 | MCP revision 2025-11-25; AWS Kiro, a spec-driven IDE, becomes generally available | 03, 14 |
| Oct 2025 | Anthropic publishes Agent Skills; Simon Willison proposes "vibe engineering" | 03, 14 |
| Sep 2025 | DORA's State of AI-assisted Software Development report: AI as an amplifier | 14 |
| Aug 2025 | EU AI Act obligations for general-purpose AI models apply | 13 |
| Jul 2025 | METR's randomized study measures a 19% slowdown for experienced developers with early-2025 tools | 14 |
| Jul 2025 | Chroma's "Context Rot" report measures degradation with input length | 02 |
| Jun 2025 | Simon Willison names the lethal trifecta | 12 |
| Apr 2025 | Google launches the A2A protocol | 03, 09 |
| Feb 2025 | Karpathy coins "vibe coding" | 14 |

## What did not change

The volatile edge moved every month; the core did not. Prompt injection is still unsolved by prompting, so security still comes from architecture. Evals still beat impressions. Workflows still come before agents and one agent before many. Budgets, verifiers and stop rules still bound every loop. Every entry above changed a name, a version, a date or a default, and none of them changed those rules. That is the reason the track keeps the two apart.

> **Status as of October 2026:** every entry above was checked against its primary source or the track's module status boxes during the October 2026 survey. Dates of regulatory application can be amended again (the Digital Omnibus did exactly that), so always confirm against the official text before a compliance decision.

## When to choose it

Read this page first when you return to the track, and before you rely on any status box older than a quarter. When you maintain your own AI systems, keep the same kind of changelog for your dependencies (model snapshots, protocol revisions, SDK versions, policies) and review it on a fixed cadence: most production surprises in this field are a dated change nobody wrote down.
