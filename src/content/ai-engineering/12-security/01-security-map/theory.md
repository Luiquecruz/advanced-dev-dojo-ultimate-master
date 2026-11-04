# Map: Security

Every module so far made the model more capable: tools in module 03, retrieval in module 04, memory in module 06, loops in module 07, a harness in module 08. Each capability is also an attack surface. This module answers one question: **what can an attacker make your AI system do, and which controls still hold when the model is fooled?**

The answer starts from an uncomfortable fact. A model reads instructions and data through the same channel, as tokens, so any text it reads can try to steer it. Nobody knows how to make a model reliably ignore instructions hidden in data. Security for AI systems is therefore mostly **architecture**: deciding what a fooled model can reach, what leaves the system, and how you would notice.

## The question and the layers

This module belongs to **layer 6, governance** (who may do what, and how we prove it), seen from the attacker's side. It leans on **layer 3, the harness**: module 08's permission policies, sandbox, egress allowlist and hooks are the mechanisms; this module decides where to point them. Module 13 continues with governance of people, data, models and cost.

| You decide | Options | The lesson |
| --- | --- | --- |
| What the attacker can say to the model | direct and indirect injection, why prompts cannot stop it | 02 |
| Whether one injection can steal data | private data, untrusted content, external communication: remove a leg | 03 |
| What the model's output may trigger | markdown images, links, HTML, encoding for the target | 04 |
| What a tool call may touch | scoped short-lived credentials, secrets outside the context | 05 |
| Which tools reach the model at all | hidden instructions in descriptions, pinned hashes, server allowlists | 06 |
| What enters and leaves the model | input and output checks, PII redaction, limits, failing closed | 07 |
| Whether the defenses work | adversarial eval suites, attack success rate, regression gates | 08 |
| A shared vocabulary for risk | the OWASP Top 10 for LLM and for agentic applications | 09 |

## Prerequisites

- **Module 03:** function calling and MCP: tool definitions, servers, `tools/list`, qualified tool names.
- **Module 07:** the agent loop and human-in-the-loop approvals.
- **Module 08:** permission rules, the path jail and egress allowlist, hooks that block and redact. This module reuses them as building blocks.
- **Module 10:** evals as tests and regression gates; red teaming is the adversarial half of the same suite.

## The path

1. **Prompt injection** (quiz). Direct and indirect injection, why delimiters and "ignore malicious instructions" do not fix it, and the design patterns that limit the damage.
2. **The lethal trifecta.** You analyze an agent configuration for private data, untrusted content and external communication per session, propose which leg to remove, and block the call that would complete it at runtime.
3. **Exfiltration and output handling.** You sanitize model output before rendering: images and links to hosts outside an allowlist, data in query strings, raw HTML, encoding for the target context.
4. **Least privilege and secrets.** You issue scoped credentials that expire per tool call, resolve secret placeholders at the tool boundary and redact secrets in every output and log.
5. **Tool poisoning and supply chain.** You scan MCP tool definitions for hidden instructions, pin their hashes, flag rug pulls and allowlist servers.
6. **Guardrails.** You build an input and output pipeline with PII redaction, length and topic limits and a model-based classifier that fails closed.
7. **Red teaming.** You build an adversarial eval suite of injected documents, measure attack success per category and gate releases on it.
8. **The OWASP Top 10s** (quiz). The LLM Top 10 (2026 edition, with the 2025 ids still widely cited) and the Top 10 for agentic applications.
9. **The threat model ADR.** Assets, trust boundaries, threats mapped to mitigations and residual risk for a support agent.

## The thread through the module

Assume the injection succeeds, then make it harmless. Lesson 02 explains why you must assume it; lessons 03 to 06 shrink what a hijacked model can reach and send; lesson 07 adds probabilistic filters as one more layer, never the only one; lesson 08 measures whether the whole stack holds against attacks you did not think of. The ADR writes all of it down so the next person can see which risks were removed, which were reduced and which were accepted.

> **Status as of October 2026:** prompt injection remains unsolved for general-purpose models. Simon Willison named it in September 2022 and the lethal trifecta in June 2025; the OWASP GenAI Security Project publishes the LLM Top 10 2026 (August 2026, succeeding the 2025 edition) and the Top 10 for Agentic Applications for 2026 (December 2025). Research such as CaMeL (Google DeepMind, 2025) and the design patterns paper (June 2025) secures agents by architecture rather than by detection.

## When to choose it

Take this module before an AI feature reads content you do not control (email, web pages, uploaded files, tickets, tool results) or before it gains a tool that writes, sends or spends. If your feature only answers questions over your own curated documents with no tools, lessons 02, 04 and 07 cover most of the risk. Write the threat model before launch, and revisit it every time the agent gains a tool.
