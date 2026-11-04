# Map: Agentic Engineering and Capstone

Thirteen modules taught you to build software **that uses** models. This last module turns to the other side of the same skill: building software **with** models, as a team whose code is increasingly written by coding agents. It answers the question the track opened with: **how do you direct agents with engineering discipline instead of vibes, and how do you prove that the result works, is safe and is worth it?** Then the capstone puts every layer into one project.

## The question and the layer

The track's six layers (model, context, harness, loop, evaluation, governance) describe the system. This module is the **seventh layer: the human**. Agentic engineering is the discipline of building production software with agents while you keep ownership of architecture, correctness and review. It reuses the other layers, pointed at your own workflow: context files and skills are context engineering for a coding agent, permission rules and sandboxes are its harness, tests and CI are its verifiers, and DORA metrics are the evals of your delivery process.

| You decide | Options | The lesson |
| --- | --- | --- |
| How much to trust generated code | vibe coding vs agentic engineering | 02 |
| What the agent builds from | a spec with requirements traced to tasks and tests | 03 |
| What the agent knows | always-on context files, skills loaded on demand | 04 |
| How you work with it day to day | small verifiable steps, TDD, worktrees, review depth by risk | 05 |
| How users experience your AI feature | streaming, uncertainty, sources, feedback, fallbacks | 06 |
| Whether any of it helps | delivery metrics, controlled studies, perception gaps | 07 |
| What changed since you learned it | a dated changelog, reviewed every quarter | 08 |
| Can you combine it all | the capstone | 09 |

## Prerequisites

- **Module 02:** context engineering and prompts as code (a context file is a prompt you version).
- **Module 03:** A2A, Agent Skills and Context Files, where `AGENTS.md` and `SKILL.md` were introduced; building an MCP server for the 2026-07-28 revision, reused in the capstone.
- **Module 04:** retrieval and grounded answers with citations.
- **Modules 07 and 08:** the agent loop with budgets, permission policies, verifiers and long-running agents: the same mechanisms coding agents run on.
- **Module 10:** evals as tests and regression gates.
- **Security and Governance in Layers (modules 12 and 13):** the lethal trifecta, threat models, owners and policies, which the capstone must deliver.

## The path

1. **Vibe coding vs agentic engineering** (quiz). Where the terms came from and what separates the two in practice: tests, review and ownership.
2. **Spec-driven development.** You build a traceability matrix from a Markdown spec, a task list and test names, and check a model-generated plan with it.
3. **Context files and skills.** You resolve `AGENTS.md` files for an edited path, parse skills, and load them by relevance under a token budget, with progressive disclosure.
4. **Working with coding agents** (quiz). Small verifiable steps, TDD, parallel agents in worktrees, review depth proportional to risk, comprehension debt.
5. **AI feature UX** (quiz). Streaming and latency budgets, showing uncertainty and sources, editable output, feedback capture and graceful fallbacks.
6. **Measuring impact** (quiz). DORA and SPACE, the METR study and its 2026 update, the DORA AI report: what the evidence says and how to measure your own team.
7. **What changed** (quiz). A dated changelog of the field, the part of the track that is updated on each quarterly review.
8. **The capstone.** A multi-file project: retrieval, tools over MCP, a budgeted agent with a verifier inside a permission policy, an eval gate, a threat model and a governance map, all checked against each other.

There is no separate ADR in this module: the capstone is the checkpoint, and it draws on the ADRs you wrote at the end of every earlier module.

> **Status as of October 2026:** "agentic engineering" is an `emerging` term: Andrej Karpathy, who coined "vibe coding" in February 2025, proposed it as the name for the disciplined practice in February 2026, and Simon Willison, who had suggested "vibe engineering" in October 2025, adopted it. Coding agents (Claude Code, Codex, Cursor, GitHub Copilot's coding agent, Gemini CLI and others) change monthly; this module teaches the practices that outlast them.

## When to choose it

Take this module once you are comfortable with the harness and evaluation modules; it assumes you can read a permission policy and a regression gate. If you already use coding agents daily, start with lessons 03 to 05 and the capstone. If you lead a team, lessons 06 and 07 are where product and management decisions meet, and lesson 08 is the page to revisit every quarter.
