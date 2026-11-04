# Context Files and Skills

A coding agent starts every session knowing nothing about your project. Whatever it needs (how to run the tests, which patterns are forbidden, how your team writes a migration) has to reach its context window, and that window is a budget: every token spent on instructions that do not apply is a token of noise, and long contexts degrade answers (context rot, from Context Engineering in module 02). Two complementary mechanisms solve this: **always-on context files** and **skills loaded on demand**.

## Always-on: context files

A context file is Markdown the harness reads before the first turn. `AGENTS.md` is the vendor-neutral name (A2A, Agent Skills and Context Files, module 03); several agents also read their own names, such as `CLAUDE.md`. In a monorepo, files can live in subfolders, and the harness includes the root file plus every file on the path to the code being edited:

```
AGENTS.md                      # every task: test command, style, never-do list
packages/api/AGENTS.md         # tasks under packages/api
packages/api/db/AGENTS.md      # migrations only
packages/web/AGENTS.md         # not loaded when editing packages/api
```

Order matters: the root comes first and the nearest file last, so the most specific rule is the freshest in the model's attention and wins a conflict. A sibling folder whose name merely starts the same way (`packages/apiary`) is not an ancestor; compare whole path segments.

Because context files are paid on **every** call, they must earn their tokens:

- commands that actually run (`npm test`, `npm run typecheck`), not aspirations;
- rules a linter cannot enforce ("never call the payments API from the web package");
- pointers to deeper documents instead of their content ("migrations: see `docs/migrations.md`").

A context file that grows into a wiki gets read once, fills the window, and is ignored where it matters. Treat it like code: review changes, delete stale lines, and prefer an architecture test over a sentence when a rule can be checked mechanically.

## On demand: skills and progressive disclosure

Procedures that apply only to some tasks (writing release notes, filling a PDF form, running the incident postmortem template) do not belong in an always-on file. An **Agent Skill** is a folder with a `SKILL.md`: YAML frontmatter (`name`, `description`) and Markdown instructions, optionally with scripts and references. The harness uses **progressive disclosure**:

1. **Metadata** of every skill (name and description, around a hundred tokens each) is always in context, as an index.
2. The **body** of a skill is loaded only when it is selected for the task.
3. Bundled **files** are opened only when the body points to them.

Selection happens in two places. The harness can **preselect** skills by relevance before the first call; the challenge scores each skill with embedding similarity between the task and the skill's metadata, plus keyword triggers, then loads the best ones that fit the budget. The model can also **request** a skill during the run (a `load_skill` tool), because it sees the index. Preselection is cheap and predictable; model requests catch what the scorer missed.

The challenge's `triggers` field is a lesson addition: the Agent Skills specification defines `name`, `description` and optional `license`, `compatibility`, `metadata` and `allowed-tools`, and recommends putting the keywords that should trigger a skill in its description.

## Budgets and failure modes

- **Always-on context that does not fit is an error**, not something to trim silently: dropping the root `AGENTS.md` removes the test command and the forbidden list.
- **Skills compete for what is left.** Rank them, cap how many load, and skip one that would overflow instead of truncating it mid-instruction.
- **Similarity is noisy.** A bag-of-words or embedding score happily matches "typo in the login label" to a database skill. A threshold, precise descriptions and explicit triggers keep irrelevant skills out.
- **Skills are code.** A skill can ship scripts and instructions your agent will follow; install them only from sources you trust and review them like dependencies (Tool Poisoning and Supply Chain, module 12).

> **Status as of October 2026:** `AGENTS.md` and Agent Skills are both hosted by the Agentic AI Foundation (Agent Skills joined in October 2026; Anthropic published the format in October 2025). Codex, Cursor, GitHub Copilot's coding agent, Gemini CLI and others read `AGENTS.md`; Claude Code reads `CLAUDE.md` and recommends keeping it short. The Agent Skills specification recommends keeping a `SKILL.md` body under about 5 000 tokens and 500 lines. Skill registries and marketplaces are multiplying, with security scanning still uneven.

## When to choose it

Put in `AGENTS.md` only what every task in that folder needs, and keep it short enough to read in a minute. Move anything task-specific (procedures, templates, scripts) into skills with precise descriptions, and let relevance plus the model's own requests load them. When an agent keeps making the same mistake, first ask whether the fix is a missing line in a context file, a missing skill, or a check that should be a test instead.
