# Checkpoint: the Harness ADR

This module built the controls that let an agent work without someone watching every step: permission rules, a sandbox, hooks, verifiers, loops with stop rules and state that outlives a session. The checkpoint turns them into a **harness design** for one unattended agent: an Architecture Decision Record plus a **harness plan** precise enough to configure and review.

A harness ADR is not "we will use agent X". It is a set of boundaries, each justified by a fact from the briefing: what the agent may do, what it can reach, what is enforced on every call, what counts as done, and when it stops and calls a human.

## The decision checklist

Work from the outside in: start with what must never happen, then what the task needs, then how the loop runs.

1. **Blast radius.** What is the worst action available to the agent (pushing to `main`, reading production secrets, deploying, deleting data)? Each becomes a deny rule, a missing credential or a sandbox boundary, ideally more than one.
2. **Least privilege.** List the calls the task actually needs (run tests, edit code in the packages, push to its own branches). Those are the allow rules; everything else asks or is denied. Credentials follow the same rule: a token that can push only to `agent/*` branches, never an admin key.
3. **Reach.** Filesystem root and network allowlist. An agent that installs packages needs the registry; it does not need the internet.
4. **Enforcement.** Which rules must hold on every call regardless of the model: hooks for blocking destructive commands, protecting tests and policies from edits, redacting secrets before they reach logs, auditing every call. Decide that enforcement hooks fail closed.
5. **Definition of done.** Which verifiers, in which order: cheap computational checks first, slow ones after, model review last if at all.
6. **The loop.** Triggers, iteration and failure limits, a budget per run that the limits respect, and who receives the escalation.

| Option | Buys | Costs |
| --- | --- | --- |
| Broad permissions, rely on review | fewest interruptions | every mistake reaches the repository; review becomes the only control |
| Narrow allow list, ask for the rest | predictable runs, readable policy | unattended runs stall on asks unless the task fits the list |
| Deny-heavy policy plus sandbox | small blast radius even when rules have gaps | setup work; occasional legitimate calls blocked |
| Model judge as the only verifier | flexible checks | slow, costly, can be wrong or gamed |

## Writing the ADR well

- **Context** names the forces with numbers: what the agent does, when it runs, what it must never do, the budget, compliance rules.
- **Decision** is one "We will" sentence naming the boundaries: what it may do, the sandbox, the enforcement and the stop rule.
- **Alternatives** are the options someone will propose later ("give it full shell access", "let it merge its own pull requests", "use an LLM reviewer instead of tests"), each with the fact that rules it out.
- **Consequences** have two sides. A narrow harness means more escalations; enforcement hooks become critical components; the team owns a policy that must evolve with the repository.

## Example: a documentation agent

```ts
export const adr = {
  id: 8,
  title: 'Let the docs agent edit Markdown only, verified by link and build checks',
  status: 'accepted',
  layer: 'harness',
  context: 'A weekly agent updates the docs site from merged pull requests. It must not change code, may not reach the internet except our docs host, and has a $2 budget per run.',
  decision: 'We will allow edits under docs/** only, sandbox the agent with no network except docs.example.com, verify with the docs build and a link checker, and open a draft pull request for review.',
  alternatives: [{ option: 'Full repository write access', reason: 'Docs updates never need code changes, so code edits would only add risk.' }],
  consequences: { positive: ['A bad run can only produce a bad docs pull request.'], negative: ['Docs that need a code example fix escalate to a human.'] },
};
```

## Pitfalls

- Allow rules as wide as the agent's power (`Bash`, `Edit(**)`), with deny rules as an afterthought.
- Credentials wider than the task: an admin token "because it was there".
- Audit hooks that run before redaction.
- A budget the loop limits cannot reach, or limits the budget cannot cover.
- Escalation to nobody in particular.

> **Status as of October 2026:** coding agent products expose these controls as configuration (permission rules, sandbox modes and network allowlists, hooks, scheduled or CI-triggered runs), but names and defaults differ between products and change often. Write the ADR in terms of the boundaries, then map them to your product's settings in an appendix you update with it.

## When to choose it

Write a harness ADR before an agent runs unattended for the first time, when it gains a new tool, credential or trigger, and after any incident. Supersede the record when the boundaries change, so the history of what the agent was allowed to do, and why, stays readable for audits.
