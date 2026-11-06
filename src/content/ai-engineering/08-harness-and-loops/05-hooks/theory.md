# Hooks

Instructions in a prompt or a context file are suggestions: the model follows them most of the time. A **hook** is code the harness runs at a fixed point of the agent's lifecycle, every time, whatever the model decided. When a rule must hold ("never print a secret into the transcript", "every shell command has a timeout", "every file edit is formatted"), it belongs in a hook, not in a sentence the model may forget after the next compaction.

## Where hooks run

| Event | Runs | Typical uses |
| --- | --- | --- |
| Session start | when a session begins or resumes | load the task list, inject today's context |
| Prompt submit | before the user's message reaches the model | block secrets pasted by mistake, add context |
| **Pre-tool** | after the model proposes a call, before it runs | **block**, **rewrite arguments**, ask a human |
| **Post-tool** | after the tool ran, before the model sees the result | **redact**, **audit**, format a file, run a linter |
| Stop | when the agent wants to finish | refuse to stop until tests pass |

This lesson builds the two tool hooks, because they sit on the path every action takes.

## What a hook can return

A pre-tool hook sees the proposed call and answers one of three things:

- **continue**: let the call through unchanged;
- **block** with a reason: the tool does not run, and the reason goes back to the model so it can adjust;
- **rewrite** with new arguments: the call runs with safer inputs, such as a capped timeout, a `--dry-run` flag or a path pinned inside the workspace.

A post-tool hook sees the call and its output, and either lets the output through or **replaces** it: redacting API keys before they enter the context (and every log, trace and future prompt built from it), truncating a huge result, or appending a lint report.

```ts
const capTimeout = (maxMs: number): PreToolHook => ({
  name: 'cap-timeout',
  matcher: 'Bash',
  run: (call) => ({ action: 'rewrite', arguments: { ...call.arguments, timeoutMs: Math.min(Number(call.arguments.timeoutMs ?? maxMs), maxMs) } }),
});
```

A **matcher** selects which tools a hook applies to: one name, a list such as `Edit|Write`, or `*` for every tool.

## Order is part of the contract

When several hooks match, decide and document how they combine. The pipeline in this lesson runs them **in order**:

- each pre-tool hook sees the arguments as rewritten by the hooks before it;
- the first block stops the chain: later hooks do not run and the tool never executes;
- each post-tool hook sees the output left by the previous one, so a redaction hook placed before an audit hook means the audit never stores the secret.

Some harnesses run matching hooks in parallel instead. Then no hook can rely on another's rewrite, and two hooks that rewrite the same call conflict. Know which model your harness uses before chaining hooks.

## Fail closed

Hooks are code, and code fails: an exception, a timeout, a malformed result. For a hook that **enforces policy**, a failure must count as a block. A secret-redaction hook that crashes and lets the raw output through has failed in the worst possible way. The runner therefore:

- wraps every hook call, and turns a thrown error, a rejected promise or an unknown result into a block that names the hook;
- gives every hook a **timeout** and treats an expired timeout the same way;
- for post-tool hooks, withholds the output instead of passing it along unredacted.

Hooks that only automate convenience (formatting, notifications) can fail open, but make that a deliberate per-hook choice, not the default.

## Hooks are privileged code

Hooks run with your user's permissions, outside the model's sandbox, on every call. Treat hook configuration like CI configuration: review it, keep it in version control, and be suspicious of hooks that arrive in a repository you just cloned. Keep hooks fast (they add latency to every tool call), deterministic and logged.

## Pitfalls

- Enforcing policy with prompt instructions instead of hooks.
- Hooks that fail open by default.
- Audit hooks that store secrets because they run before redaction.
- Slow hooks on every call: a 500 ms hook on a 200-call task adds well over a minute.
- Pattern-based blocking treated as complete security; it is a guardrail, the sandbox is the boundary.

Coding agents expose hook events around the session, the user prompt, tool use and stopping. A pre-tool hook blocks with a dedicated exit code or a structured decision (allow, deny, ask) and can replace arguments; a post-tool hook can feed a reason back or replace the tool output. Matching hooks run in parallel, and other non-zero exit codes are non-blocking errors unless the hook is configured to block on failure, so enforcement hooks must use the blocking exit code deliberately.

## When to choose it

Use a pre-tool hook when a rule about tool inputs must always hold and is checkable in code (block destructive commands, cap timeouts, pin paths). Use a post-tool hook for anything that must happen to every output before the model or a log sees it (redaction, audit, formatting). Keep using prompts and context files for guidance that needs judgment, and permission rules plus the sandbox for access control; hooks complement them, they do not replace them.
