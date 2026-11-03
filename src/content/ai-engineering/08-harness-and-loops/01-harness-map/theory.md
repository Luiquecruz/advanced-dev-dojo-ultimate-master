# Map: Harness and Loop Engineering

Module 07 built an agent: a model that calls tools in a loop until the task is done, with budgets, approvals and checkpoints. This module answers the two questions that decide whether you can let that agent work on real systems with little supervision: **what surrounds the model** (the harness), and **how work keeps going until it is verified** (the loop). The same model can be a liability or a dependable colleague depending on the answers.

## The question and the layers

This module spans **layer 3, the harness** (what surrounds the model: tools, permissions, sandbox, hooks, verification, context files) and **layer 4, the loop** (how work repeats until done). Module 03 gave the agent tools; module 07 gave it a loop; this module decides what those tools may touch, what checks every action, and what keeps a loop from running forever or forgetting its work. Module 12 (security) and module 13 (governance) build on these controls.

| You decide | Options | The lesson |
| --- | --- | --- |
| What a harness is made of | loop, tools, context, permissions, sandbox, hooks, verifiers, state | 02 |
| Which calls may run | allow, ask and deny rules with patterns and precedence | 03 |
| What any call can reach | path jail, network egress allowlist, OS sandboxes | 04 |
| Which rules must always hold | pre-tool hooks that block or rewrite, post-tool hooks that redact or audit | 05 |
| What counts as done | verifiers, feedback into the next step, bounded attempts | 06 |
| When work starts and stops | triggers, stop rules, persistent state, escalation | 07 |
| How work survives many sessions | task lists, progress files, resuming without redoing | 08 |

## Prerequisites

- **Module 03:** function calling: tool definitions, parsing tool-call arguments, returning tool messages.
- **Module 07:** the agent loop, budgets and stop conditions, human-in-the-loop approvals and durable execution. This module wraps that loop in controls.
- **Module 02:** structured outputs and Zod schemas, which become verifiers here.

## The path

1. **What is a harness** (quiz). Agent = model + harness; why the same model behaves differently in different harnesses; the components; context files such as `AGENTS.md`.
2. **Permission policies.** You build allow, ask and deny rules over commands and paths, deny-first precedence, compound commands and path traversal, and review a model's proposed calls.
3. **Sandboxing tools.** You build a path jail over the virtual file system and a network egress allowlist that sees through IP spellings, `localhost` tricks and redirects.
4. **Hooks.** You build an ordered hook pipeline: block, rewrite, redact, audit, and fail closed when a hook breaks.
5. **Verifiers.** You build a verify loop with cheap-first checks, actionable feedback, completeness checks and bounded attempts.
6. **Loop engineering.** You build a triggered loop with persistent state, stop rules (done, stuck, failures, budget), escalation and idempotent triggers.
7. **Long-running agents.** You build sessions that share a task list and a progress file on disk, resume where the last one stopped and never redo finished work.
8. **The harness ADR.** You design the harness of a nightly maintenance agent for a briefing: permissions, sandbox, hooks, verifiers and the loop.

## The thread through the module

Every lesson removes one reason to watch the agent. Policies decide what it may ask for (03); the sandbox limits what anything can reach (04); hooks enforce what must always happen (05); verifiers decide what counts as done (06); loops decide when to try again and when to call a human (07); artifacts let the work outlive a session (08). None of them makes the model smarter. Together they make its mistakes cheap, visible and recoverable.

> **Status as of October 2026:** "harness engineering" and "loop engineering" are `emerging` terms. The first spread with OpenAI's February 2026 article on building a product with Codex agents and Anthropic's guidance on harnesses for long-running agents (November 2025); the second with Addy Osmani's June 2026 essay. Coding agents such as Claude Code, Codex, Cursor and Gemini CLI ship their own permission systems, sandboxes, hooks and context files; this module builds the mechanisms in plain code so you can read and configure any of them.

## When to choose it

Take this module before you let an agent act without a human approving every step: unattended runs, CI-triggered fixes, nightly jobs, multi-day builds. If your agent only answers questions with read-only tools, lessons 02 to 04 are enough. Write the ADR at the end before the first unattended run, not after the first incident.
