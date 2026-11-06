# Working with Coding Agents

A coding agent is the agent loop of module 07 running in your repository: it reads files, edits them, runs commands and repeats until it believes the task is done. Everything you learned about loops applies. It needs a goal it can check, feedback it can act on, limits, and someone who reviews the result. This lesson turns those ideas into daily habits.

## Small, verifiable steps

Agents are fast at producing code and slow at noticing that they misunderstood the task. The cheapest defense is **scope**: one change per session or per prompt, small enough that you can read the diff in a few minutes and revert it without regret.

- **Plan first.** Ask the agent to explore and propose a plan before it edits anything; correct the plan, not the code.
- **One concern per change.** "Add the endpoint" and "refactor the error handling" are two changes, two reviews, two commits.
- **Commit at every green step.** Version control is the undo button for agent work; a clean history also lets `git bisect` find the change that broke something.
- **Keep the agent's own checks running.** Type checks, linters and tests after each step catch mistakes while the context is still fresh (Verifiers, module 08).

Big-bang prompts ("build the billing module") produce big diffs nobody reviews properly, which is how vibe coding sneaks into a disciplined team.

## TDD with agents

Test-driven development fits agents unusually well, because a failing test is a precise, machine-checkable goal:

1. You (or the agent, with your review) write a test that captures the behavior and **fails for the right reason**.
2. The agent makes it pass, iterating against the test runner instead of against your patience.
3. You review the implementation and refactor with the tests as a safety net.

Two rules keep the loop honest. **Review the tests more carefully than the code**: a test that asserts the wrong thing makes the agent confidently wrong. And **protect the tests from the agent**: an agent stuck on a failing test may weaken or delete it; restrict its write access to test files or review every change to them.

## Parallel agents and worktrees

Agents spend much of their time waiting on models and test runs, so running several at once is tempting. They must not share a working directory, or they overwrite each other's files and test each other's half-finished changes. **Git worktrees** give each agent its own checkout of a separate branch from the same repository:

```bash
git worktree add ../billing-export -b feature/billing-export
git worktree add ../fix-vat-rounding -b fix/vat-rounding
```

Each agent works, tests and commits in isolation; you review and merge each branch like a pull request. The limit is not the machine; it is your review capacity. Three agents producing changes you cannot review in time is a queue of unreviewed code, not productivity.

## Review depth proportional to risk

Not every diff deserves the same attention. Decide the depth by what a mistake would cost:

| Risk | Examples | Review |
| --- | --- | --- |
| High | authentication, payments, permissions, data migrations, security boundaries | line by line, run it yourself, a second reviewer |
| Medium | business logic, public APIs, concurrency | read the diff and the tests, ask for an explanation of anything unclear |
| Low | copy changes, styling, internal scripts | skim, rely on tests and CI |

Ask the agent to **explain** its change: what it did, why, and what it did not handle. An explanation that does not match the diff is the fastest signal that something is off. Mechanical checks (architecture tests, linters, type checks) catch whole classes of problems without spending review attention on them.

## Comprehension debt

**Comprehension debt** is the growing gap between the code a team ships and the code it understands. Technical debt makes itself felt as friction; comprehension debt feels like speed until the day an incident needs someone who knows how the code works. It accumulates when diffs are merged because they look clean and the tests pass.

Pay it down deliberately: require explanations in pull requests, keep architecture and decisions in ADRs and context files, rotate who reviews agent changes in each area, and occasionally implement something by hand to keep the skill. If nobody on the team could fix a module without an agent, that module is a risk.

The practices above are older than any particular coding agent.

## When to choose it

Use small steps and TDD for any change you will ship; let agents run longer and unattended only inside a sandbox, on a branch, against tests you trust. Add parallel agents when your review capacity, not the agents, is the bottleneck you have measured. Scale review depth with risk, and treat "nobody here understands this code" as a defect to fix.
