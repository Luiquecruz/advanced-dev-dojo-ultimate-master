Build the context layer of a coding agent: parse `SKILL.md` files, pick the `AGENTS.md` files that apply to the edited file, score skills by relevance, assemble the system context under a token budget with progressive disclosure, and let the model load more skills on demand.

`SkillError`, `ContextBudgetError` and the `LOAD_SKILL_TOOL` definition (`load_skill` with a `name` string argument) are already defined. Use `embed`, `cosine_similarity` and `count_tokens` from `dojo_ai`.

A **context file** is a dict `{"path", "content"}` with a POSIX path relative to the repository root. A **skill** is a dict `{"name", "description", "triggers", "body"}`. Sections and results are dicts too; functions and parameters use Python names.

## 1. `parse_skill(markdown, folder_name=None)`

The file starts with a `---` line; the frontmatter ends at the next `---` line. Each frontmatter line `key: value` sets a field (split at the first `:`, strip both sides; unknown keys are ignored). Return `{"name", "description", "triggers", "body"}`: `"triggers"` is the comma-separated `triggers` value, stripped, without empty items (`[]` when absent); `"body"` is everything after the closing line, stripped.

Raise a `SkillError` when the frontmatter is missing or not closed, when `name` is not 1–64 characters of lowercase letters, digits and hyphens (no hyphen at the start or end, no `--`), when `folder_name` is given and differs from `name`, or when `description` is empty or longer than 1024 characters.

## 2. `context_files_for(files, target_path)`

Return the files named `AGENTS.md` whose folder is the root or an ancestor folder of `target_path` (whole path segments: `packages/api` is not an ancestor of `packages/apiary/x.ts`), sorted from the root to the deepest folder.

## 3. `score_skill(skill, task)`

`cosine_similarity(embed(task), embed(f"{name} {description}"))` plus the number of triggers contained in the task, compared case-insensitively.

## 4. `build_agent_context(*, task, target_path, files, skills, budget_tokens, min_score=0.5, max_skills=2)`

Build sections `{"kind", "name", "text", "tokens"}` with `"tokens"` = `count_tokens(text)`:

1. One `context-file` section per file of `context_files_for`, in that order: name is the path, text is `# <path>\n<content>`.
2. When there are skills, one `skill-index` section named `skills`: a heading line followed by one line `- <name>: <description>` per skill. Never include bodies here.
3. If these always-on sections exceed `budget_tokens`, raise a `ContextBudgetError`.
4. Rank the skills by `score_skill` (highest first, ties by name). Walk the ranking: a score below `min_score` is skipped as `below_threshold`; once `max_skills` are loaded the rest that pass the threshold are skipped as `limit`; a skill whose section (`skill`, named after the skill, text `# Skill: <name>\n<body>`) does not fit the remaining budget is skipped as `over_budget`, and the walk continues; otherwise it is loaded.

Return `{"system", "sections", "tokens", "loaded", "skipped"}`: `"system"` joins the section texts with a blank line, `"tokens"` is the sum of section tokens, `"loaded"` the loaded skill names in order, `"skipped"` the `{"name", "reason"}` entries in ranking order.

## 5. `answer_with_skills(model, *, max_steps=4, **context_options)`

`context_options` are the keyword arguments of `build_agent_context`. Build the context, then `await model.generate(...)` with `[{"role": "system", "content": system}, {"role": "user", "content": task}]` and `"tools": [LOAD_SKILL_TOOL]`. Append each assistant turn (with its `"toolCalls"`). A reply without tool calls ends the run. Otherwise answer every tool call with a `tool` message (`"toolCallId"` set):

- a tool other than `load_skill`: content contains `Unknown tool`;
- a name that is not a skill (or arguments that do not parse): content contains `Unknown skill`;
- a skill already loaded: content contains `already loaded`;
- a skill section that does not fit the budget left: content contains `budget`;
- otherwise the skill section text; the skill is now loaded and its tokens count against the budget.

Return `{"answer", "loaded", "steps", "tokens"}`: the final text (or `None` after `max_steps` calls without one), every loaded skill (up front, then on demand), the number of model calls, and the context tokens used.
