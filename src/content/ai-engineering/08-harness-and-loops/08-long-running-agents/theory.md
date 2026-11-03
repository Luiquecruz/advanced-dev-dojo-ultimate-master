# Long-Running Agents

Some work does not fit in one session: building a feature list of 200 items, migrating a codebase package by package, a research task that runs for days. Context windows fill up, sessions crash, machines restart, and a fresh session starts with **no memory** of the previous one. A long-running agent harness makes each session a shift worker: it reads the handover notes, does one well-defined piece of work, verifies it, and leaves notes for the next shift.

## Why not one giant session

- **Context is finite and degrades.** Long contexts cost more per call, and quality drops as old, irrelevant content piles up. Compaction (summarizing the history) helps but loses details unpredictably.
- **Crashes are certain over hours.** A process that holds progress only in memory loses it.
- **Agents declare victory early.** With a vague goal, a model will often decide the project is done after a few features, or mark items complete without testing them.

The fix is to move state **out of the context and into artifacts** the harness controls.

## The artifacts

| Artifact | Format | Purpose |
| --- | --- | --- |
| Task list | structured (JSON) | every unit of work with a status; the single source of truth for what is left |
| Progress file | free text (Markdown) | what each session did, what failed and why, notes for the next session |
| Version control | commits | a recoverable history of the work itself; revert a bad session |
| Init script | shell | how to start the environment and run a smoke test, so sessions do not rediscover it |

Use JSON for anything a program decides on (status, attempts) and prose for what a model reads. A model edits Markdown checklists creatively; it is much less likely to rewrite a JSON field it was told to treat as data, and your harness can validate JSON.

## The session protocol

1. **Initialize once.** A first session (or a script) writes the task list with every item pending. A later run of the initializer must not overwrite it, or all progress is lost.
2. **Get up to speed.** Each session reads the task list, the tail of the progress file and the recent commits, and runs the smoke test. If the environment is broken, fixing it comes first.
3. **Pick the next unfinished task**, one at a time. Working on one item per session (or per step) is the most effective remedy against half-finished work spread across many items.
4. **Do it and verify it** with the verifiers from lesson 06. Only a verified task changes to `done`.
5. **Record**: update the task's status, append a progress line, commit. Then take the next task or end the session.

```ts
const tasks = readTasks(directory);
const task = tasks.find((candidate) => candidate.status === 'pending');
if (!task) return;
const output = await work(task, tailOfProgress(directory));
task.status = (await verify(task, output)).passed ? 'done' : task.status;
writeTasksAtomically(directory, tasks);
```

## Rules that keep the state honest

- **Never redo completed work.** The next task is chosen from the file, not from the model's memory, so a done task is never offered again.
- **The agent may change status, not scope.** Removing or rewording tasks to make the list "pass" is the long-running version of deleting failing tests. The harness owns the list's shape; the agent owns status transitions, through code that only flips statuses.
- **Bound retries per task.** After N failed attempts, mark the task `blocked` with the reason and move on; a human reviews blocked tasks instead of the agent spinning on one forever.
- **Write state atomically.** Write the new list to a temporary file and rename it over the old one, so a crash mid-write never leaves half a JSON file. Append-only progress logs are naturally crash-tolerant.
- **Save after every task**, not at the end of the session: a crash then costs at most the task in flight.

## Long-running agents and durable execution

Durable execution (module 07) checkpoints the steps of a workflow you wrote, so a crashed run replays to where it stopped. Long-running agent harnesses solve the neighboring problem: an open-ended stream of tasks where each session is a fresh agent and the handover happens through files and commits. Large systems combine both: a durable workflow schedules agent sessions, and each session reads and writes the shared artifacts.

## Pitfalls

- Progress kept only in the conversation (or a summary of it).
- An initializer that overwrites the task list on every run.
- Letting the agent edit the task list freely.
- Marking tasks done on the agent's word instead of a verifier.
- Non-atomic writes of the state file.

> **Status as of October 2026:** Anthropic's "Effective harnesses for long-running agents" (November 2025) describes an initializer session that writes a JSON feature list (every feature initially failing), an `init.sh` script and a progress file, followed by coding sessions that work on one feature at a time, verify end to end, commit and update the progress notes. Coding agents also offer built-in task lists, persistent memory files and scheduled or goal-driven sessions; their names and limits change often.

## When to choose it

Use this harness whenever work spans more than one session or more than an hour: multi-feature builds, migrations, backlogs of similar fixes, long research. Keep it simple: one JSON task list, one append-only progress file, version control, one task at a time, verification before `done`. For short tasks that fit in a single context, a plain agent loop with a budget is enough; for strict business processes with fixed steps, prefer a durable workflow over an open-ended agent.
