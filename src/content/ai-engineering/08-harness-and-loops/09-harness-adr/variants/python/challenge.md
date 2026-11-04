Write the harness ADR for **Nightwatch**, an unattended maintenance agent for a TypeScript monorepo.

## Briefing

Nightwatch fixes failing tests on `main` and applies dependency patch updates, then opens a **draft pull request** from a branch named `agent/<topic>`. Humans review and merge; Nightwatch never merges.

- **Triggers:** every night at 02:00 (`schedule`) and whenever CI fails on `main` (`ci-failure`).
- **What it needs:** read and edit code under `packages/**`; run `npm test`, `npm run typecheck` and `npm run lint`; commit, and push to `agent/*` branches.
- **Must never:** push to `main` or force-push anything; read `.env` files (at any depth) or anything under `secrets/`; run deploy scripts (`npm run deploy`, `npm run deploy:prod`, ...); use `curl` or `wget`; edit CI workflows under `.github/`.
- **Needs a human:** installing a new dependency (`npm install <package>`).
- **Incident last quarter:** a previous agent made the suite pass by deleting failing tests.
- **Sandbox:** the repository is mounted at `/workspace`. Network access only to the npm registry (`registry.npmjs.org`) and GitHub's API (`api.github.com`).
- **Credentials available:** `github-token:agent-branches` (push to `agent/*` only), `github-token:admin`, `npm-read-token`, `production-db`, `aws-admin`.
- **Compliance:** every tool call is audited, and audit logs are shipped to an external vendor, so secrets must never reach them.
- **Verification:** the checks available are `typecheck` (20 s), `lint` (15 s), `unit-tests` (2 min), `integration-tests` (12 min) and `llm-review` (a model reviewer).
- **Budget:** at most **$8 per run**; one iteration costs about **$0.40**. After **3** failed attempts, escalate to the **package owner**.

Hook catalog: `block-dangerous-commands`, `cap-timeout`, `protect-test-files` (blocks deleting or editing existing test files), `redact-secrets`, `audit-log`, `format-on-edit`.

## Task

In `adr.py`, define two module-level dicts. Keys keep the same camelCase names as the JSON contract (`"networkAllowlist"`, `"preToolUse"`, `"maxIterations"`).

**`ADR`**, the record:

- `id`: a positive integer; `title`: at least 10 characters; `status`: `"accepted"`; `layer`: `"harness"`.
- `context`: at least 80 characters; mentions permissions or access, and the budget or cost.
- `decision`: at least 40 characters, starts with `We will`.
- `alternatives`: at least two `{"option": ..., "reason": ...}` dicts with distinct `option` texts (at least 3 characters) and a `reason` of at least 20 characters.
- `consequences`: `{"positive": [...], "negative": [...]}`, each a list with at least one item of at least 15 characters.

**`HARNESS_PLAN`**, the plan:

- `"permissions": {"allow", "ask", "deny"}`: rules written as in lesson 03 (`Tool` or `Tool(pattern)`; tools `Bash`, `Read`, `Edit`; `*` in commands matches anything, `*` in paths stays in one folder and `**` crosses folders; deny, then ask, then allow; no match means ask; compound commands are not used here).
- `"sandbox": {"root", "networkAllowlist", "credentials"}`: the filesystem root, the allowed hosts, and the credential names the agent receives.
- `"hooks": {"preToolUse", "postToolUse", "onFailure"}`: hook names from the catalog in execution order, and `"block"` or `"continue"` for what happens when a hook fails.
- `"verifiers"`: names from the verification list, in the order they run.
- `"loop": {"triggers", "maxIterations", "maxFailures", "budgetUsd", "escalateTo"}`.

The plan must be coherent with the briefing:

1. The tests evaluate your rules against calls taken from the briefing: what it needs is allowed, what it must never do is denied, a new dependency asks. `allow` contains no bare tool and no rule that matches every command or path.
2. The root is `/workspace`; the allowlist contains exactly the two hosts; credentials include the agent-branch token and nothing wider or unrelated to the task.
3. Hooks: the incident and the compliance rule each need a hook; redaction runs before the audit; enforcement fails closed.
4. Verifiers: `typecheck`, `lint` and `unit-tests` are required; `integration-tests`, if used, runs after `unit-tests`; `llm-review`, if used, runs last.
5. Loop: both triggers; `maxFailures` matches the briefing; `budgetUsd` at most $8 and `maxIterations × $0.40` within it; escalation goes to `"package-owner"`.

The tests check structure and coherence, not your wording.
