# The OWASP Top 10s for LLM and Agentic Applications

Auditors and customers will ask how your AI feature handles "the OWASP Top 10". For AI there are two lists, both from the **OWASP GenAI Security Project**. Knowing them lets you map your threat model (lesson 10) to a shared vocabulary and spot the risk you forgot.

## Top 10 for LLM Applications (2026, and the 2025 edition)

The first list covers applications built around a model: chat, RAG, summarization, simple tool use. The 2026 edition keeps the ten risk areas of the 2025 edition, reorders them partly by incident data and renames one. Much tooling and earlier lessons still cite the 2025 ids, so know both.

| 2026 | Risk | 2025 | Where this track covers it |
| --- | --- | --- | --- |
| LLM01 | **Prompt Injection** (now also hidden in images and audio) | LLM01 | lessons 02, 03, 08 |
| LLM02 | **Sensitive Information Disclosure**: personal data, secrets or proprietary data in answers | LLM02 | lessons 05, 07; permission-aware retrieval (module 04) |
| LLM03 | **Excessive Agency**: too many tools, permissions or autonomy | LLM06 | lessons 03, 05; permissions (module 08) |
| LLM04 | **Supply Chain**: models, datasets, packages, plugins | LLM03 | lesson 06; model supply chain (module 11) |
| LLM05 | **Data and Model Poisoning**: tampered training, fine-tuning or embedding data | LLM04 | module 11; memory poisoning (module 06) |
| LLM06 | **Unbounded Consumption**: cost and denial of service through tokens and calls | LLM10 | budgets (modules 01, 07), rate limits |
| LLM07 | **Misinformation**: confident wrong answers people act on | LLM09 | grounding and citations (module 04), evals (module 10) |
| LLM08 | **Hidden Context Exposure** (was System Prompt Leakage) | LLM07 | lessons 05, 08 |
| LLM09 | **Vector and Embedding Weaknesses**: cross-tenant leaks, poisoned or inverted embeddings | LLM08 | module 04 |
| LLM10 | **Improper Output Handling**: model output passed unchecked to browsers, shells, databases | LLM05 | lesson 04 |

Three entries deserve a second look. **Hidden context exposure** covers everything the user does not see (system instructions, retrieved documents, memory, tool schemas and results): assume it can be extracted, so keep credentials and access rules out of it. **Misinformation** is a security risk because people act on wrong answers; grounding and evals fix it, not filters. **Improper output handling** fell in the ranking, not in danger: one unsanitized markdown image is still a zero-click leak (lesson 04).

## Top 10 for Agentic Applications (2026)

The second list covers systems where the model **plans and acts**: agents with tools, memory, delegation and autonomy. It extends the LLM list rather than replacing it.

| Id | Risk | In short |
| --- | --- | --- |
| ASI01:2026 | **Agent Goal Hijack** | content the agent reads redirects its objective or plan |
| ASI02:2026 | **Tool Misuse and Exploitation** | legitimate tools used harmfully, through manipulated inputs, poisoned metadata or unsafe chains of safe calls |
| ASI03:2026 | **Identity and Privilege Abuse** | agents running on borrowed, shared or broad long-lived credentials; confused deputies |
| ASI04:2026 | **Agentic Supply Chain Vulnerabilities** | tools, MCP servers, plugins, prompts and agents loaded at runtime, which can change after review |
| ASI05:2026 | **Unexpected Code Execution (RCE)** | untrusted input becomes running code: generated scripts, unsafe interpreters, sandbox escapes |
| ASI06:2026 | **Memory and Context Poisoning** | planted data in memory, indexes or summaries steers future runs |
| ASI07:2026 | **Insecure Inter-Agent Communication** | unauthenticated or unprotected messages between agents are spoofed, altered or replayed |
| ASI08:2026 | **Cascading Failures** | one agent's error or compromise spreads through dependent agents and workflows |
| ASI09:2026 | **Human-Agent Trust Exploitation** | agents persuade people to approve unsafe actions, eroding the human check |
| ASI10:2026 | **Rogue Agents** | agents acting outside policy through compromise, misalignment or drift while looking legitimate |

In this track: ASI01 is lessons 02 and 03; ASI02 and ASI03 are lessons 03 and 05 plus module 08's permissions; ASI04 is lesson 06; ASI05 is module 08's sandbox; ASI06 is module 06; ASI07 and ASI08 are module 09; ASI09 is module 07's approvals (approval fatigue is an attack surface); ASI10 is module 13.

The agentic list leans on a principle you have used throughout: **least agency**, meaning an agent gets only the tools, permissions and autonomy its task needs, the agent-level form of least privilege.

## How to use the lists

- **As a checklist, not a design.** Walk the threat model through all twenty entries: "not applicable because...", "mitigated by..." or "accepted because...".
- **As shared vocabulary.** Tag threats, incidents and red-team categories with the ids (`LLM05`, `ASI02`), so findings can be compared across teams and audits.
- **Not as a ranking of your risks.** A summarizer and a payments agent have very different top threes.
- **Alongside the classics.** The web and API Security Top 10s (Node.js track) still apply.

Check genai.owasp.org for newer editions before an audit.

## When to choose it

Use the LLM list for any feature that calls a model, and add the agentic list as soon as the model calls tools, keeps memory, delegates to other agents or acts without a human approving each step. Run both lists against the threat model before launch, after adding a tool or an agent, and at each quarterly review.
