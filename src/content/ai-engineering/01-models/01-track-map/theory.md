# How This Track Works

AI engineering is software engineering around a component that is **non-deterministic** (the same input can produce different outputs), **expensive** (every call costs money and seconds) and **attackable** (its input can be written by an adversary). Most of the quality, cost and risk lives in the decisions around the model, and that is what this track teaches.

## Six layers of decisions

Every AI feature answers the same six questions. They combine independently: a small model with excellent retrieval and evals often beats a frontier model with none.

| Layer | Question | Examples | Modules |
| --- | --- | --- | --- |
| 1. Model | Which model, where it runs, how it is adapted | API vs open weights, small vs frontier, routing | 01, 11 |
| 2. Context | What the model sees on each call | prompts, retrieval, knowledge graphs, memory | 02, 04, 05, 06 |
| 3. Harness | What surrounds the model | tools, MCP, permissions, sandbox, hooks | 03, 08 |
| 4. Loop | How work repeats until done | workflows, agent loops, stop rules, multi-agent | 07, 08, 09 |
| 5. Evaluation | How we know it works | evals, traces, regression gates | 10 |
| 6. Governance | Who may do what, and how we prove it | security, identity, cost, regulation | 12, 13 |

A seventh layer is **you**. *Agentic engineering* (module 14) is the discipline of building software with coding agents while keeping ownership of architecture, correctness and review. The capstone combines every layer in one project.

## How a module flows

Modules follow the layers from the inside out. Each module:

1. **Opens with a map lesson**: what the module answers, its layer, prerequisites and the path.
2. **Alternates concepts and practice.** Concept-heavy topics are quiz lessons; anything that is code is a challenge.
3. **Ends with an ADR checkpoint.** You write an Architecture Decision Record for a fictional product briefing: context, decision, rejected alternatives, consequences, plus a module-specific plan (a model plan here, a retrieval plan in module 04). Tests check structure and coherence with the briefing, not your wording. Together the ADRs become the portfolio you reuse in the capstone.

Every theory ends with **When to choose it**: the hard part is rarely the API, it is knowing when a technique pays off.

## This module: models for engineers

Layer 1, seen from the outside: what a model does with your input and what it costs. Prerequisites: TypeScript, HTTP and async patterns (the Node.js track covers them). The path: how models behave → calling one through your own thin layer → tokens, cost and latency → model families → retries, routing and fallbacks → benchmarks and their limits → the model ADR.

## The fake model

Challenges never call a real model. They run against a **fake provider** built into Dev Dojo (`@dojo/ai`). It does not imitate any real model; it reproduces the *classes of behavior* every model generation shows: text in many phrasings, valid and malformed JSON, tool calls (including unknown tools and broken arguments), refusals, truncated output, slow replies, rate limits and server errors.

That is a feature, not a compromise:

- **No keys and no cost.** It runs in your browser.
- **Deterministic grading.** Tests script exactly which failure happens when, and `forEachSeed` runs your code across many seeded variations: your code must handle *every* phrasing and failure order, not one lucky transcript.
- **It does not go stale.** Tests check engineering properties (did you retry the `429`, validate the JSON, stop the loop), so they keep passing when the market moves.

What the fake model cannot do is judge quality. That is exactly why module 10 teaches you to build evals for real models yourself.

## Multi-language challenges

The track is not tied to one language. Theory, quizzes and challenge contracts are shared; the code lives in one variant per language. Every challenge ships a **Node.js (TypeScript)** variant, and **Python** variants (real CPython running in your browser through Pyodide) are being added lesson by lesson: when a lesson has both, a switch in the editor toolbar picks the language. A lesson passed in one language counts as complete, and each language you pass gets its own check mark.

## Reading the labels

- **Maturity tags** on every lesson: `established` (stable definitions and tooling), `emerging` (appeared recently, still settling), `hype-watch` (popular claims that outrun the evidence; learn them so you can question them).
- **"Status as of" boxes** hold volatile facts: model names, prices, context sizes, benchmark scores, laws. Everything outside them should stay true for years.

> **Status as of October 2026:** this track was surveyed in October 2026. Terms such as harness engineering, loop engineering and agentic engineering are `emerging`; RAG, evals, prompt injection and MCP are `established`.

## When to choose it

Follow the modules in order if you are new to building with models: each layer assumes the ones before it. If you already ship AI features, read each module's map lesson and jump to its ADR checkpoint; if the briefing feels easy, move on, and if it does not, the lessons in between are your path. Throughout, keep the cross-cutting question in mind: would plain code solve this better? Sometimes the best AI engineering decision is not to call a model at all.
