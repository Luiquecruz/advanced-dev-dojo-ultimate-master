# Track: AI Engineering

Content base for a study track that turns a software engineer into an AI engineer: from how models behave to agents, harnesses, loops, memory, evaluation, security and governance in production.

Track id `ai-engineering`, title "AI Engineering". Survey date: October 2026. Terms marked **(emerging)** appeared in 2025–2026 and are still settling; terms marked **(established)** have stable definitions and tooling.

## 1. Track overview

**Goal:** by the end, the learner can design, build, evaluate, secure and govern software that uses models, and can direct coding agents with engineering discipline instead of vibes.

**Audience:** software engineers (frontend or backend) who already ship code. The track does not train ML researchers; model training appears only as far as an engineer needs to decide between prompting, retrieval and adaptation.

**Prerequisites:** TypeScript, HTTP and REST, async patterns, basic data structures (graphs, trees, hash maps). The Node.js track covers all of these.

**Central thesis:** AI engineering is software engineering around a non-deterministic, expensive, attackable component. The model is one part; most of the quality, cost and risk lives in the decisions around it. Those decisions form six layers that combine independently:

| Layer | Question | Examples |
| --- | --- | --- |
| 1. Model | Which model, where it runs, how it is adapted | API vs open weights, small vs frontier, fine-tuning, quantization |
| 2. Context | What the model sees on each call | prompts, retrieval, memory, tool results, compression |
| 3. Harness | What surrounds the model | tools, permissions, sandbox, hooks, verification, context files |
| 4. Loop | How work repeats until done | agent loop, workflows, stop rules, schedules, multi-agent |
| 5. Evaluation | How we know it works | evals, traces, regression suites, online metrics |
| 6. Governance | Who may do what, and how we prove it | policy, identity, data, models, agents, cost, regulation |

A seventh layer is the human: **agentic engineering**, the discipline of building software with agents while keeping ownership of architecture, correctness and review.

**Size and shape:** the track is long on purpose (the subject is broad and moves fast); what matters is that it feels complete and easy to follow. See section 19 for how it stays navigable and current. 14 modules, each with concepts, practice and a deliverable.

| Module | Theme | Level |
| --- | --- | --- |
| 1 | Models for engineers | Beginner |
| 2 | Prompt and context engineering | Beginner |
| 3 | Tools and protocols (function calling, MCP, A2A, skills) | Intermediate |
| 4 | Retrieval and RAG | Intermediate |
| 5 | Knowledge graphs and ontologies | Intermediate |
| 6 | Memory (including graph memory) | Advanced |
| 7 | Agents and workflows | Intermediate |
| 8 | Harness engineering and loop engineering | Advanced |
| 9 | Multi-agent systems and swarms | Advanced |
| 10 | Evaluation and observability | Intermediate |
| 11 | Model adaptation and open models (Hugging Face, fine-tuning, local inference) | Advanced |
| 12 | Security | Advanced |
| 13 | Governance in layers | Advanced |
| 14 | Agentic engineering, SDD and capstone | Expert |

Cross-cutting threads, present in every module: cost and latency, good and bad practices, and "when not to use AI at all".

---

## 2. Module 1: Models for engineers

**Concepts**

- What an LLM is from the outside: next-token prediction, tokens and tokenization, context window, input vs output tokens, pricing per token.
- Sampling: temperature, top-p, seeds, why the same prompt gives different answers, determinism limits even at temperature 0.
- Model families: frontier closed models (API), open-weight models (downloadable), small language models (SLMs), reasoning models (extended thinking, test-time compute), multimodal models (vision, audio, realtime voice), embedding models, rerankers.
- **Open weights vs open source:** weights published under a license vs code, data and recipe published; model licenses and their restrictions.
- **Cognitive core** **(emerging)**: Karpathy's idea of a small model that sacrifices encyclopedic knowledge for reasoning capability and looks facts up through tools and retrieval. Useful as a design direction: knowledge outside the model, reasoning inside.
- Limits that shape architecture: hallucination, knowledge cutoff, sycophancy, position bias in long contexts, refusals, prompt sensitivity.
- Choosing a model: quality vs latency vs cost, routing (cheap model first, escalate), fallbacks across providers, pinning model versions, deprecation schedules.
- Benchmarks and their pitfalls: contamination, saturation, leaderboard gaming; why your own evals beat public benchmarks.

**Practice**

- Call a model through a provider-agnostic layer, compare two models on the same 20 inputs, record cost, latency and quality.

**Deliverable**

- A model choice note: candidates, measured cost/latency/quality, chosen model and fallback, pinned version.

---

## 3. Module 2: Prompt and context engineering

**Concepts**

- Prompt engineering fundamentals: system vs user messages, role, task, constraints, examples (few-shot), output format, delimiters, chain-of-thought vs reasoning models that think on their own.
- **Structured outputs:** JSON mode, schema-constrained decoding, validating with Zod/Pydantic, retry on parse failure.
- **Context engineering** **(established, 2025)**: deciding everything the model sees per call, not only the prompt. Strategies: write (scratchpads, notes), select (retrieval, tool results, memory), compress (summaries, trimming), isolate (sub-agents, separate contexts).
- **Context rot:** quality drops as context grows with irrelevant material; more context is not free.
- Prompt caching, batching, and how they change cost.
- Prompts as code: versioning, templates, reviews, tests, feature flags, rollback.
- Prompt optimization: DSPy-style programs where prompts are compiled from examples and metrics.

**Bad practices**

- Prompt spaghetti: string concatenation spread across the codebase with no versioning.
- Context stuffing: dumping whole documents "just in case".
- Using an LLM for deterministic work (date math, sorting, validation) that plain code does better and cheaper.

**Practice**

- Turn a free-text extraction into a schema-validated structured output with retries and a prompt version.

**Deliverable**

- A prompt registry with versioned prompts and a test per prompt.

---

## 4. Module 3: Tools and protocols

**Concepts**

- **Function calling / tool use:** the model proposes a call, the application executes it, the result returns as context. The application, not the model, executes.
- Tool design as an interface (agent-computer interface): names, descriptions, parameter schemas, error messages written for the model, idempotency, pagination, returning only what is needed.
- **Tool overload:** too many tools degrade selection; group, namespace or load tools on demand.
- **MCP (Model Context Protocol)** **(established)**: open protocol for exposing tools, resources and prompts to any client. Servers, clients, transports (stdio, Streamable HTTP), authorization with OAuth, the tool vs resource vs prompt distinction. Hosted by the Linux Foundation's Agentic AI Foundation (AAIF) since December 2025, together with AGENTS.md and goose.
- **A2A (Agent2Agent)** **(emerging)**: protocol for agents talking to agents (agent cards, tasks, messages). Common split: MCP is how an agent reaches tools, A2A is how agents delegate to each other.
- **Agent Skills** **(emerging)**: packaged instructions plus scripts loaded on demand, a way to give agents procedural knowledge without bloating context.
- **AGENTS.md / CLAUDE.md:** repository-level context files read by coding agents.

**Practice**

- Build an MCP server with two tools and one resource, then a client that lists and calls them.

**Deliverable**

- A tool catalog with schemas, descriptions and error contracts reviewed for model usability.

---

## 5. Module 4: Retrieval and RAG

**Concepts**

- **RAG (Retrieval-Augmented Generation)** **(established)**: retrieve relevant content, put it in context, generate a grounded answer with citations.
- Ingestion pipeline: loading, cleaning, chunking (fixed, recursive, semantic, structure-aware), metadata, deduplication, updates and deletions.
- **Embeddings:** vectors, cosine similarity, embedding model choice, dimensions, multilingual concerns.
- Vector stores: pgvector, Qdrant, Weaviate, Milvus, Pinecone, LanceDB; indexes (HNSW, IVF); filtering by metadata and tenant.
- **Hybrid search:** BM25 keyword search plus vectors, fused with Reciprocal Rank Fusion.
- **Reranking:** cross-encoders or rerank models over the top candidates.
- Query side: query rewriting, multi-query, HyDE, decomposition, routing to the right index.
- **Contextual retrieval:** prepending chunk-level context before embedding.
- **Agentic RAG:** the agent decides when and what to retrieve, iterates, and checks sufficiency.
- **GraphRAG:** retrieval over a knowledge graph and its community summaries (see module 5).
- Long context vs RAG vs fine-tuning: when each wins.
- Evaluating retrieval and generation separately: recall@k, MRR, nDCG, faithfulness/groundedness, answer relevance, citation accuracy.
- Access control in retrieval: permission-aware search, never retrieve what the user cannot see.

**Bad practices**

- Evaluating only final answers, never retrieval.
- One chunk size for every document type.
- Ignoring updates and deletes (stale and "ghost" documents).
- Leaking documents across tenants or permission boundaries.

**Practice**

- Build a RAG pipeline: chunker, embedding index, BM25, RRF fusion, reranker stub, cited answers; measure recall@k on a golden set.

**Deliverable**

- A retrieval eval report comparing vector-only, BM25-only and hybrid.

---

## 6. Module 5: Knowledge graphs and ontologies

**Concepts**

- Graphs as a data structure (nodes, edges, direction, properties) and as a knowledge model.
- **Property graphs** (Neo4j, Cypher, GQL) vs **RDF** triples (subject, predicate, object; SPARQL).
- **Ontology:** a formal vocabulary of classes, properties and constraints for a domain (OWL, RDFS, schema.org); taxonomies vs ontologies; why an ontology makes data and agent outputs consistent across teams.
- **Semantic layer:** business definitions (metrics, entities) shared by BI, APIs and agents, so "revenue" means one thing.
- Building a knowledge graph with LLMs: entity and relation extraction, **entity resolution** (merging duplicates), schema-guided extraction, validation against the ontology.
- **GraphRAG** (Microsoft): entity graph plus community detection and summaries for global questions that plain RAG cannot answer.
- Graph traversal for multi-hop questions; combining vector search with graph expansion.

**Assessment:** ontologies are worth it for regulated domains, multi-team data and agent interoperability; they are over-engineering for a single small app. The track teaches when.

**Practice**

- Extract entities and relations from documents into a typed graph, validate them against a small ontology, answer multi-hop questions by traversal.

**Deliverable**

- A minimal ontology for a domain plus a graph built from text, with rejected extractions logged.

---

## 7. Module 6: Memory

**Concepts**

- Context window as working memory vs persistent memory across sessions.
- Memory types from cognitive architectures (CoALA): working, episodic (what happened), semantic (facts), procedural (how to do things: skills, rules).
- Write policies: what to remember, when, extraction vs raw logs, deduplication, conflict resolution.
- Read policies: retrieval by relevance, recency and importance; budgets per call.
- **Graph memory** **(emerging)**: storing memories as entities and relations instead of loose text. **Temporal knowledge graphs** (Graphiti/Zep) keep a bi-temporal model: when a fact was true vs when it was learned; contradicted facts are invalidated, not overwritten.
- Other approaches: vector memories with deduplication (Mem0), self-editing memory blocks and filesystem memory (Letta, formerly MemGPT), progress files for long-running coding agents.
- Forgetting, retention and the right to erasure; per-user isolation.
- **Memory poisoning:** injected content that persists and steers future sessions.

**Assessment:** published comparisons show simple memory (files, vector store) is often competitive; add a temporal graph when retrieval needs relations or time. Start simple, measure, then upgrade.

**Practice**

- Implement a temporal graph memory: add facts with validity intervals, invalidate on contradiction, query "what was true at time T", and compare with a flat vector memory on the same questions.

**Deliverable**

- A memory design note: types kept, write/read policies, retention and isolation rules.

---

## 8. Module 7: Agents and workflows

**Concepts**

- **Workflows vs agents:** workflows follow code paths you define; agents let the model choose the next step. Prefer the simplest that works.
- Workflow patterns: prompt chaining, routing, parallelization (sectioning, voting), orchestrator-workers, evaluator-optimizer.
- **The agent loop:** observe → think → act (tool call) → observe result → repeat until a stop condition. ReAct, planning, reflection, self-correction.
- Stop conditions and budgets: max steps, max tokens, max cost, timeouts, "done" criteria that a verifier can check.
- Human-in-the-loop: approvals for risky actions, interrupts, resumable state.
- **Durable execution:** long tasks survive crashes and restarts (checkpoints, Temporal-style workflows, LangGraph persistence).
- Computer use and browser agents: acting through screens and DOM; when an API is better.
- Code-executing agents: sandboxes for generated code.

**Bad practices**

- **Over-agentification:** an agent where a three-step workflow suffices.
- Unbounded loops with no budget or verifier.
- Hidden side effects in tools without confirmation.

**Practice**

- Implement an agent loop with tools, a step and cost budget, a verifier, and a human approval gate for one destructive tool.

**Deliverable**

- An agent spec: goal, tools, stop rules, budgets, approval points, failure modes.

---

## 9. Module 8: Harness engineering and loop engineering

**Concepts**

- **Harness** **(emerging, 2026)**: everything around the model that makes an agent work: system prompt, tools, permissions, sandbox, context files, hooks, memory, verification and UI. The same model in different harnesses behaves very differently. The term gained traction with OpenAI's February 2026 "Harness engineering" article on Codex and with Anthropic's guidance on harnesses for long-running agents.
- Harness components:
  - permissions and policy (allow/ask/deny, rule-based plus classifier-based checks);
  - sandboxing (OS-level sandboxes, containers, network egress limits, worktrees);
  - hooks (before/after tool calls, on stop) for enforcement and automation;
  - context files and skills (AGENTS.md, CLAUDE.md, on-demand skills);
  - verification (tests, linters, type checks, screenshots) the agent must pass;
  - state for long-running work (progress files, task lists, git history).
- **Loop engineering** **(emerging, mid-2026)**: designing systems that repeatedly prompt, check and steer agents toward a goal with little human prompting. Building blocks: trigger (schedule, event, previous result), action, verifier, stop rule, persistent state, recovery. Seen as the step after prompt, context and harness engineering. Includes scheduled agents, CI-triggered agents and "run until the spec passes" loops (sometimes called the Ralph loop).
- Economics of loops: cost per iteration, convergence, detecting stuck loops, escalation to humans.

**Bad practices**

- Loops without verifiers ("keep going until it looks done").
- Harness permissions wider than the task (full shell, production credentials).
- Treating the model as the fix for problems the harness should solve (missing tests, missing context).

**Practice**

- Build a mini harness: tool registry, permission policy (allow/ask/deny), sandboxed file system, pre-tool hook, and a verifier; then a loop that runs until tests pass or a budget ends.

**Deliverable**

- A harness design document for one internal use case: permissions, sandbox, hooks, verification, loop triggers and stop rules.

---

## 10. Module 9: Multi-agent systems and swarms

**Concepts**

- Why multiple agents: context isolation, specialization, parallelism; and the costs: more tokens, coordination failures, harder debugging.
- Patterns: supervisor/orchestrator-workers (hierarchical), pipeline (sequential), handoffs (control passes between agents), debate and voting, blackboard (shared state).
- **Swarm** **(emerging)**: peer agents self-organizing through shared state or handoffs, without a central planner. More resilient, less predictable. OpenAI's experimental Swarm library popularized handoffs and evolved into its Agents SDK.
- Communication: shared memory, message passing, A2A between independently deployed agents.
- Failure modes: cascading errors, agents agreeing with each other (sycophancy at scale), infinite delegation, duplicated work, cost multiplication.
- Frameworks: LangGraph, OpenAI Agents SDK, Claude Agent SDK subagents, CrewAI, Microsoft Agent Framework (AutoGen lineage), Mastra, Google ADK.

**Assessment:** a single well-equipped agent beats a swarm for most tasks; multi-agent pays off for broad, parallelizable research or strictly separated responsibilities.

**Practice**

- Implement orchestrator-workers and a handoff swarm for the same task; compare quality, token cost and failure behavior with traces.

**Deliverable**

- A decision record: single agent vs multi-agent for one product scenario, with measured numbers.

---

## 11. Module 10: Evaluation and observability

**Concepts**

- **Evals are tests for non-deterministic code:** golden datasets, assertions (exact, regex, schema, semantic), rubric scoring.
- **LLM-as-judge:** pairwise vs absolute scoring, calibration against human labels, judge bias (position, verbosity, self-preference).
- Eval-driven development: write evals before changing prompts, models or tools; run them in CI as regression gates.
- Agent evals: trajectory/trace evaluation (right tools, right order, no unsafe calls), task success, cost and step counts.
- Offline vs online evaluation: shadow traffic, A/B tests, user feedback, guardrail hit rates.
- **Observability:** traces with spans per model and tool call, token and cost accounting, OpenTelemetry GenAI semantic conventions; tools such as Langfuse, LangSmith, Arize Phoenix, Braintrust.
- Datasets from production: sampling traces into eval sets, labeling, privacy filtering.
- Drift: model version changes, data changes, prompt changes.

**Bad practices**

- **Vibes-based evaluation:** "it looked good in the demo".
- Uncalibrated LLM judges treated as ground truth.
- Logging prompts and outputs with personal data in plain text.

**Practice**

- Build an eval runner: dataset, scorers (exact, schema, judge with a fake model), regression comparison between two prompt versions, report.

**Deliverable**

- An eval suite in CI that blocks a regression.

---

## 12. Module 11: Model adaptation and open models

**Scope now:** concepts and decisions only (theory and quizzes). Hands-on training or fine-tuning with tiny models stays open for a future iteration; it needs a separate architecture decision (in-browser compute, Python engine, model downloads) before it can be designed.

**Concepts**

- The adaptation ladder: prompting → retrieval → few-shot/tools → fine-tuning → training. Climb only when the lower step fails on evals.
- Fine-tuning: supervised fine-tuning (SFT), parameter-efficient methods (LoRA, QLoRA, adapters), when it helps (format, style, narrow tasks) and when it does not (fresh knowledge).
- Preference and reinforcement tuning at a conceptual level: RLHF, DPO, GRPO, RL with verifiable rewards; distillation from large to small models.
- Synthetic data: generation, filtering, risks (model collapse, bias amplification).
- **Hugging Face ecosystem:** Hub (models, datasets, Spaces), model cards and dataset cards, `transformers`, `datasets`, `tokenizers`, PEFT, TRL, Inference Endpoints, `smolagents`; licenses on the Hub.
- Local and self-hosted inference: Ollama, llama.cpp, vLLM, SGLang, TGI; quantization (GGUF, AWQ, GPTQ), hardware and memory math.
- Model supply chain: `safetensors` vs pickle (code execution on load), provenance, gated models, AI bill of materials (AI-BOM).
- When small models win: latency, privacy, cost, on-device; the cognitive core direction.

**Practice (concept level)**

- Read a model card critically; estimate memory for a quantized model; decide a routing policy between a local small model and an API model.

**Deliverable**

- An adaptation decision: why prompting/RAG is or is not enough, with an eval threshold that would justify fine-tuning.

---

## 13. Module 12: Security

**Concepts**

- **Prompt injection:** direct (user) and indirect (content the model reads: web pages, emails, documents, tool results). No prompt fully prevents it; design assumes it happens.
- **The lethal trifecta** (Simon Willison): private data + untrusted content + an exfiltration channel in the same agent. Remove one leg.
- **OWASP Top 10 for LLM Applications (2025)** and **OWASP Top 10 for Agentic Applications (2026)**, including agent goal hijack, tool misuse, identity and privilege abuse, memory poisoning, cascading failures, rogue agents.
- Data exfiltration paths: markdown images, links, tool calls with data in parameters.
- Defense in depth: least-privilege tools, sandboxing, egress allowlists, output encoding, human approval for sensitive actions, dual-LLM / quarantined-LLM patterns, CaMeL-style capability tracking.
- Guardrails: input/output classifiers, PII detection, policy checks; their limits and false positives.
- Secrets: never in prompts or context files; scoped, short-lived credentials for tools.
- Supply chain: malicious MCP servers and skills, tool poisoning (instructions hidden in tool descriptions), rug pulls, typosquatted packages suggested by models (slopsquatting).
- Red teaming and adversarial evals as part of the eval suite.

**Practice**

- Attack a small agent with indirect injection hidden in a document, then fix it by removing a trifecta leg and adding an approval gate; prove the fix with an adversarial eval.

**Deliverable**

- A threat model for one agent: assets, entry points, trifecta analysis, mitigations, residual risk.

---

## 14. Module 13: Governance in layers

Governance is not only data governance. It is a stack of controls, each owned by someone, each enforceable and auditable. The 2026 shift: from policy documents to **runtime enforcement**.

| Layer | Concerns | Controls |
| --- | --- | --- |
| Organizational | who may use which AI for what; accountability | AI policy, acceptable use, AI inventory/registry with owners, risk tiers, review board, training |
| Regulatory and legal | compliance per jurisdiction and use case | see the global regulatory map below; standards (NIST AI RMF and GenAI profile, ISO/IEC 42001); personal data laws (LGPD, GDPR); sector rules; copyright and licensing |
| Data | what data reaches models and where it goes | classification, consent and purpose, PII minimization and redaction, residency, retention, lineage, provider data-use terms (training opt-out), RAG permission filtering |
| Model | which models are approved and how they change | model registry, approval process, model and system cards, version pinning, evaluation before promotion, deprecation plans, license checks |
| Agent and identity | what agents can do on whose behalf | unique identity per agent, least privilege, delegation and on-behalf-of flows, short-lived scoped credentials, approval gates, kill switches, runtime policy decision points, NIST NCCoE agent identity work |
| Application and output | what users see and how decisions are made | guardrails, human oversight for consequential decisions, disclosure that content is AI-generated, watermarking/provenance (C2PA), appeal paths |
| Operational and cost | spend, capacity and reliability | budgets per team and feature, rate limits, FinOps for tokens, provider fallback, incident response for AI failures |
| Engineering | how AI is used to build software | rules for AI-assisted code (review required, tests required, provenance of generated code), allowed tools and models, secrets hygiene, license scanning of generated code |
| Audit and evidence | proving all of the above | immutable logs of prompts, tool calls and decisions (with privacy), eval records, change history, periodic reviews |

**Global regulatory map (status as of October 2026; volatile, review every quarter)**

The track teaches the stable ideas (risk-based regulation, transparency, human oversight, data protection, accountability) and keeps dates in a dated "status" box per jurisdiction.

| Jurisdiction | Instrument | Status |
| --- | --- | --- |
| European Union | AI Act (risk tiers) | GPAI obligations since Aug 2025; most Article 50 transparency duties from Aug 2026; the Digital Omnibus on AI (Regulation (EU) 2026/1744, in force July 2026) moved Annex III high-risk obligations to Dec 2027 and Annex I to Aug 2028 |
| Brazil | LGPD + ANPD guidance; PL 2338/2023 (AI legal framework) | LGPD applies to personal data used by AI today; PL 2338 passed the Senate in Dec 2024 and is still in a special committee of the Câmara (vote pushed past the Oct 2026 elections); a separate Executive bill proposes a national AI system (SIA) |
| United States | no federal AI law; NIST AI RMF, sector regulators, state laws | Colorado replaced its 2024 AI Act with SB 26-189 (signed May 2026, applies from Jan 2027); other states regulate specific uses (hiring, deepfakes, chatbots) |
| China | targeted measures (generative AI services, deep synthesis, algorithm registry) | AI-generated content labeling rules since Sep 2025; anthropomorphic AI interaction measures since Jul 2026 |
| South Korea | AI Basic Act | in force since Jan 2026 (fines paused for at least a year); covers high-impact AI and generative AI labeling, reaches some foreign providers |
| Japan | AI Promotion Act | in force 2025, promotion-focused, no penalties; AI Basic Plan adopted 2026 |
| United Kingdom | principles-based, sector regulators | no horizontal AI law |
| International | OECD AI Principles, UNESCO Recommendation, Council of Europe Framework Convention on AI, G7 Hiroshima process | soft law and treaty commitments shaping national laws |

Lesson design: one lesson on the shared principles, one on the EU AI Act as the most detailed model, one on Brazil (LGPD in AI systems, ANPD, PL 2338 and what is already enforceable), one comparative quiz across the map, and an exercise that maps a product's features to obligations in two jurisdictions.

**Bad practices (the governance failures)**

- **Shadow AI:** employees using unsanctioned AI tools with company data because sanctioned options are missing or slow. Fix by offering good sanctioned tools, not only bans.
- **AI sprawl / agent sprawl:** uncontrolled proliferation of models, copilots, agents, MCP servers and API keys with no owner; over-permissioned agents and orphaned OAuth grants that outlive pilots.
- Policy theater: documents with no runtime enforcement.
- Shared service accounts for many agents (no attribution).
- "Human in the loop" that rubber-stamps (automation bias).

**Practice**

- Build an agent registry and a runtime policy check: every tool call carries an agent identity, the policy decides allow/ask/deny from risk tier and scope, decisions are audit-logged.

**Deliverable**

- A governance map for one product: each layer, its owner, its controls, and how each control is enforced and evidenced.

---

## 15. Module 14: Agentic engineering, SDD and capstone

**Concepts**

- **Vibe coding vs agentic engineering** **(emerging, 2026)**: vibe coding accepts output without review; agentic engineering (Karpathy proposed the name in February 2026; Simon Willison had suggested "vibe engineering") builds production software with agents under human ownership of architecture, correctness and review. Tests are the main differentiator: they let agents iterate safely.
- **SDD (Spec-Driven Development)** **(emerging)**: the spec becomes the main artifact; agents plan, break into tasks and implement from it. Tools: GitHub Spec Kit (specify → plan → tasks → implement), AWS Kiro (spec-centric IDE), Tessl (spec as source), OpenSpec, BMAD-METHOD. Levels: spec-first, spec-anchored, spec-as-source. Risks: specs that drift from code, ceremony for small changes.
- Working with coding agents: context files, small verifiable steps, TDD with agents, parallel agents in worktrees, code review of agent output, commit hygiene.
- **Comprehension debt:** code nobody on the team understands; **AI slop:** low-quality generated content and code. Mitigations: review depth proportional to risk, explanations required, architecture tests.
- Measuring impact honestly: lead time, defect rate, review time, not lines generated.
- Product and UX for AI features: streaming, latency budgets, showing uncertainty and sources, editable outputs, feedback capture, graceful fallbacks, cost per feature.

**Capstone**

Given a product briefing (users, data sensitivity, scale, regulation), the learner must:

1. Choose the architecture across the six layers and record each decision in an ADR.
2. Write the spec (SDD) for one feature.
3. Build it: RAG or memory as needed, tools over MCP, an agent or workflow with budgets and verifiers, inside a harness with permissions.
4. Ship an eval suite with regression gates and traces.
5. Deliver a threat model and a governance map.
6. Present trade-offs and what was left out on purpose.

**Evaluation criteria**

- Simplest design that meets the evals (workflow before agent, single agent before multi-agent).
- Measured quality, cost and latency, not impressions.
- Security by architecture (trifecta analysis), not by prompt.
- Enforceable governance with clear owners.

---

## 16. Good and bad practices (summary)

| Bad practice | What happens | Better practice |
| --- | --- | --- |
| Shadow AI | data leaves through unsanctioned tools | sanctioned tools that are actually good, plus visibility |
| AI / agent sprawl | unowned agents, orphaned credentials, duplicated spend | registry with owners, identity per agent, lifecycle and expiry |
| Vibes-based evaluation | regressions ship unnoticed | evals in CI, golden sets, calibrated judges |
| Prompt spaghetti | nobody knows which prompt is live | versioned prompts with tests |
| Context stuffing / context rot | worse answers, higher cost | select, compress, isolate |
| Over-agentification | slow, costly, unpredictable | workflows first, agents when needed |
| Swarm for everything | token explosion, cascading errors | single agent, add agents with measured benefit |
| Unbounded loops | runaway cost | budgets, verifiers, stop rules |
| Tool overload | wrong tool choices | fewer, well-described tools, loaded on demand |
| Security by prompt | injection succeeds | remove a trifecta leg, sandbox, approvals |
| Memory without policy | poisoning, privacy leaks | write/read policies, isolation, retention |
| Framework lock-in too early | hard to debug, hard to leave | plain code first, frameworks where they earn it |
| LLM for deterministic tasks | errors and cost for no gain | plain code |
| Unpinned model versions | silent behavior changes | pin, evaluate, then promote |
| Vibe coding in production | comprehension debt, AI slop | agentic engineering: specs, tests, review |
| Policy theater | rules nobody enforces | runtime enforcement and audit evidence |

---

## 17. Glossary of buzzwords

| Term | Meaning | Maturity |
| --- | --- | --- |
| RAG | retrieve then generate with citations | established |
| LangChain / LangGraph | Python/JS framework for LLM apps / graph-based agent orchestration with persistence | established |
| Context engineering | curating everything the model sees per call | established |
| Harness engineering | designing the scaffolding around the model (tools, permissions, sandbox, verification) | emerging (2026) |
| Loop engineering | designing systems that repeatedly prompt, verify and steer agents with trigger, verifier and stop rule | emerging (mid-2026) |
| Agentic engineering | building software with agents under human ownership and review | emerging (2026) |
| Vibe coding | accepting AI-generated code without review | established term, bad practice in production |
| SDD | spec-driven development with agents | emerging |
| Cognitive core | small model focused on reasoning, knowledge kept outside | emerging (concept) |
| MCP | open protocol for tools, resources and prompts | established |
| A2A | open protocol for agent-to-agent delegation | emerging |
| Agent Skills | on-demand packaged instructions and scripts | emerging |
| Swarm | peer agents coordinating through handoffs or shared state | emerging |
| GraphRAG | retrieval over a knowledge graph and community summaries | established |
| Temporal knowledge graph | graph where facts carry validity time, used for agent memory | emerging |
| Ontology | formal vocabulary of classes, relations and constraints | established |
| Shadow AI | unsanctioned AI use with company data | established |
| AI sprawl / agent sprawl | uncontrolled proliferation of AI tools, agents and credentials | emerging |
| Lethal trifecta | private data + untrusted content + exfiltration channel | established |
| LLM-as-judge | a model scoring another model's output | established |
| Comprehension debt | code the team no longer understands | emerging |
| Hugging Face | hub and libraries for open models, datasets and demos | established |

---

## 18. Reference resources

- Anthropic: "Building effective agents"; "Effective context engineering for AI agents"; "Effective harnesses for long-running agents"; Contextual Retrieval.
- OpenAI: "Harness engineering: leveraging Codex in an agent-first world" (February 2026); Agents SDK docs.
- Model Context Protocol specification (modelcontextprotocol.io); A2A specification; Agentic AI Foundation (Linux Foundation).
- Martin Fowler's site: "Understanding Spec-Driven Development: Kiro, spec-kit, and Tessl"; articles on harness engineering for coding agents.
- Addy Osmani: "Agentic Engineering"; "Agent Harness Engineering".
- Simon Willison's blog: prompt injection, the lethal trifecta.
- OWASP GenAI Security Project: Top 10 for LLM Applications 2025; Top 10 for Agentic Applications 2026.
- NIST AI RMF and Generative AI Profile; NIST NCCoE agent identity project; ISO/IEC 42001.
- EU AI Act and the Digital Omnibus on AI (Regulation (EU) 2026/1744).
- Microsoft GraphRAG; Graphiti (Zep); Mem0; Letta; CoALA paper (Cognitive Architectures for Language Agents).
- Hugging Face docs (Hub, transformers, PEFT, TRL, smolagents); Chip Huyen, "AI Engineering" (O'Reilly).
- Andrej Karpathy: Dwarkesh Patel interview (cognitive core, decade of agents).

---

## 19. Keeping a long, fast-moving track easy to follow

**Navigation**

- Every module opens with a map lesson: what the module answers, which layer of the six it belongs to, prerequisites, and the path through its lessons.
- Lessons are short and single-purpose; long topics split into a sequence ("RAG 1: ingestion", "RAG 2: hybrid search"...).
- Every module ends with an ADR checkpoint (as in React Architecture) so the learner builds a portfolio of decisions toward the capstone.
- The glossary (section 17) is available as concept cards in every lesson that uses a term.

**Freshness**

- Separate the **stable core** (concepts that last years: retrieval, evals, loops, injection, governance layers) from the **volatile edge** (tools, versions, laws, vendor features). Theory teaches the core; volatile facts sit in a clearly marked "Status as of <date>" box.
- Maturity tags on lessons and glossary terms: `established`, `emerging`, `hype-watch`.
- A `reviewed` date in each lesson's `meta.json` (needs a small loader/UI change) and a quarterly review checklist: regulation table, protocol versions, framework names, model families, OWASP lists.
- A "What changed" changelog lesson at the end of the track, updated on each review, so returning learners see the delta.
- Challenges never depend on a specific vendor model or API version: they run against the deterministic fake model, so they do not break when the market moves.

## 20. Adaptation for Dev Dojo

Dev Dojo has no backend and must not hold API keys, so grading cannot call real models.

### Multi-language challenges (new platform feature)

Implemented; the mechanism is documented in `.claude/docs/ARCHITECTURE.md` ("Multi-language challenges") and the authoring rules in `.claude/docs/CONTENT_GUIDE.md`.

Generic tracks such as AI Engineering are not tied to one language. The learner picks the language of each challenge; Node.js (TypeScript) first, Python when its engine exists. Other generic tracks will reuse the same mechanism.

- **Content:** a challenge can ship one variant per language: `variants/node/` and `variants/python/`, each with `starter`, `solution` and `tests`. `challenge.md` stays shared; a variant may add `challenge.md` for language-specific names (`summarizeTrace` vs `summarize_trace`). Hints and approach are shared, with code snippets per language when needed.
- **Track:** `track.json` declares `languages` (for example `["node", "python"]`) instead of a single `engine`; each language maps to an engine. Single-language tracks keep `engine` unchanged.
- **UI:** a language selector in the challenge toolbar, shown only when the lesson has more than one variant; the choice is remembered per track.
- **Progress:** a lesson counts as complete when its challenge passes in any language; the store also records which languages passed (badges per language), the chosen language per track, and the learner's code per lesson and language. The new fields are additive, so the storage key stays v1 without a migration.
- **Verification:** the verify suite runs every variant; each declared variant must pass with its solution and fail with its starter. Python variants can be added lesson by lesson after the Python engine exists.
- **Python engine (future):** Pyodide in the sandbox iframe or a worker, a pytest-like runner, and the same fake model and fake API exposed to Python.

### Engine support for AI lessons

- **Engine:** the `node` engine first (TypeScript, Hono, in-browser Node runtime); Python variants later through the multi-language feature.
- **Fake model provider:** a `fakeModel` global (like the fake REST API), described in the next section.
- **Deterministic embeddings:** a small built-in embedding function (hashed bag-of-words or a tiny fixed vocabulary) so RAG lessons compute real cosine similarity, BM25 and RRF without a model.
- **Libraries to evaluate for the registry** (check browser compatibility and versions in `node_modules` before adopting): `@modelcontextprotocol/sdk` (in-memory transport for MCP lessons), the Vercel AI SDK `ai` package and its test mock models, LangChain.js with its fake chat models, `zod`.
- **Real model mode:** none for now. Possible later for the **Run** button only (never grading): bring your own key, local Ollama, or an in-browser WebGPU model.
- **Formats:** challenges for everything that is code (agent loop, harness permissions, loop with verifier, RAG pipeline, graph memory, ontology validation, eval runner, policy engine, MCP server); quizzes for regulation, model training, Hugging Face ecosystem and frameworks comparisons; ADR checkpoints per module as in the React Architecture track.

### The fake model: deterministic without pretending to be a real model

A scripted model is reproducible but not realistic, and real models change every few months. The fake model therefore does not imitate any model. It is a test double for the **classes of behavior** that every model generation shares, so the learner's code is graded on how it handles models in general, not on one model's wording.

- **Provider-agnostic contract:** messages, tool definitions, tool calls, structured output, streaming chunks, usage (tokens, cost) and errors follow the common denominator of current provider APIs. Lessons code against this contract through a thin client; when provider APIs shift, only the contract adapter changes, not the lessons.
- **Behavior profiles instead of fixed transcripts:** tests compose behaviors the learner's code must survive: valid answer, malformed JSON, schema-valid but wrong values, unknown tool name, invalid tool arguments, refusal, truncated output (max tokens), slow response, rate limit (429) and server error, prompt injection obeyed, hallucinated citation, varying phrasing of the same answer.
- **Seeded variability:** profiles draw from a seeded random generator, so one test can run the learner's code across many seeds (property-style): the code must pass for every phrasing and failure order, not for one lucky script, yet every run is reproducible.
- **Recorded transcripts (cassettes):** for realism, examples and some replay tests use real outputs recorded from current models, stored with the model name and recording date. They are refreshed in the quarterly review (section 19); tests that replay them check structure and handling, never exact wording.
- **Model-specific knowledge** (features, limits, prices, model names) lives in theory "Status as of" boxes and quizzes, never in challenge assertions.

The result: grading stays deterministic and free, learners still meet realistic output, and challenges keep passing when the market moves because they test engineering properties, not model text.

## 21. Decisions and open questions

Decided:

1. Track id `ai-engineering`, title "AI Engineering".
2. Challenges are multi-language (Node.js now, Python later) through a new platform feature reused by future generic tracks.
3. Module 11 is concept-only for now; hands-on model training stays open for a future architecture decision.
4. Regulation coverage is global, including Brazil.
5. The track is long and complete, built for navigation and freshness (section 19).
6. No real model mode for now; grading and **Run** use the fake model, built from behavior profiles, seeded variability and dated recorded transcripts.
7. A lesson passed in one language is complete in every language, with a check mark per language.
8. Order of work: the multi-language feature first (done), then the fake model, then the lessons in module order.

Open:

None. Next steps: the fake model provider, then the lessons in module order.
