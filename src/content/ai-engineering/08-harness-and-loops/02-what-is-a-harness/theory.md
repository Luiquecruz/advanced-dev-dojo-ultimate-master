# What Is a Harness

A model on its own predicts text. An **agent** is a model plus everything around it that turns predictions into actions: the loop that calls it again, the tools it can use, what goes into its context, what it is allowed to do, where it runs, what checks its work and what it remembers. That surrounding machinery is the **harness**. A short definition that has stuck: *agent = model + harness*.

## Same model, different results

Put one model in two harnesses and you get two different products. Agent leaderboards such as Terminal-Bench rank **agent and model pairs**, and the same model can land at quite different positions depending on the harness around it. Teams that build coding agents report the same in practice: most of their gains between model releases come from better tools, better context and better feedback, not from the model.

The reasons are concrete:

- **Tools shape what is possible.** A precise `edit_file` tool with clear errors beats a shell where the model must write `sed` commands.
- **Context shapes what is known.** An agent that is told the test command and the architecture rules wastes no steps rediscovering them.
- **Feedback shapes what is fixed.** An agent that sees the failing test output corrects itself; one that never runs tests ships the bug.
- **Limits shape what can go wrong.** Permissions, sandboxes and budgets decide whether a mistake costs a retry or an incident.

So when an agent misbehaves, ask first whether the harness let it: missing tests, missing context and over-wide permissions are harness problems, and a bigger model is an expensive way to paper over them.

## The components

| Component | Decides | Lesson |
| --- | --- | --- |
| Loop | when the model is called again and when the run stops | module 07, lesson 07 |
| Tools | what the model can do, with which descriptions and errors | module 03 |
| Context management | system prompt, context files, retrieved docs, compaction, sub-agents | modules 02, 04 |
| Permissions | which calls run, wait for a human, or are refused | 03 |
| Sandbox | what any call can reach on disk and on the network | 04 |
| Hooks | rules enforced on every call, before and after | 05 |
| Verifiers | what counts as done, and the feedback when it is not | 06 |
| State | what survives between sessions: task lists, progress notes, commits | 08 |

A useful split for the controls: **guides** act before the agent acts (context files, examples, conventions), and **sensors** observe afterwards so it can self-correct (tests, linters, review). Another: the **vendor harness** is built into the product you use (its loop, tools and prompts), while the **user harness** is what your team configures on top (context files, rules, hooks, test suites). You rarely control the first; you own the second.

## Context files

A **context file** is a Markdown file in the repository that the harness loads into every session: build and test commands, conventions, an architecture map, pointers to deeper docs. It is the cheapest guide you can write.

- **`AGENTS.md`** is an open, tool-neutral format read by many coding agents. Files can be nested: the agent reads the one closest to the code it edits, so a package can carry its own instructions, and an explicit instruction in the chat overrides the file.
- **`CLAUDE.md`** is Claude Code's equivalent (project, user and organization levels), and other tools have their own names; several can read `AGENTS.md` too.

What makes them work:

- **Short and specific.** Every line costs context on every call and dilutes the rest. Write verifiable instructions ("run `npm run verify` before committing") instead of virtues ("write good code").
- **A table of contents, not an encyclopedia.** Point to `docs/architecture.md` instead of pasting it; the agent reads it when the task needs it.
- **Maintained like code.** Wrong instructions are worse than none: review changes to context files and fix them when the agent repeats a mistake.
- **Not enforcement.** A context file is something the model usually follows. Rules that must always hold go into permissions, the sandbox and hooks.

## Pitfalls

- Blaming the model for failures the harness caused (no tests, no context, no feedback).
- Permissions as wide as the machine "so the agent is not blocked".
- Giant context files that crowd out the task itself.
- Rules that matter written only as prose.
- Swapping harnesses (or models) without re-running your evals.

Context files such as `AGENTS.md` and `CLAUDE.md` are read by many coding agents, and tools differ in which names they read. Keep each file short, as a map to indexed docs rather than an encyclopedia: a long file competes with the task for the same context window.

## When to choose it

Think in harness terms whenever an agent will act on real systems. Before changing models, check the harness: does the agent have the right tools, the commands and conventions it needs, a way to verify its work, and limits matching the task? Start every repository that agents touch with a short context file, tests the agent can run, and deny rules for secrets and pushes; add sandboxing, hooks and loops as the agent gains autonomy.
